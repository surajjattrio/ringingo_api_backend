import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { CommonFunctions } from "../common/common_functions";
import { InboundCampaignSchema } from "../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { CallQueueSchema } from "../call-queue/schema/call-queue.schema";
import { CallQueueAgentSchema } from "../call-queue/schema/call-queue-agent.schema";
import { ExtensionDocument, ExtensionSchema } from "../extension/schema/extension.schema";
import { TenantSchema } from "../tenant/schema/tenant.schema";
import { UserSchema } from "../user/schema/user.schema";
import { AgentLiveReportSchema } from "../call-center/schema/agent-live-report.schema";
import { AgentCampaignLoginSchema } from "../call-center/schema/agent-campaign-login.schema";

export type ChecklistSeverity = "info" | "warning" | "critical";

export interface DebugChecklistItem {
    id: string;
    label: string;
    pass: boolean;
    detail: string;
    severity: ChecklistSeverity;
    verificationCommand?: string;
}

@Injectable()
export class InboundCallDebugService {
    private readonly logger = new Logger( InboundCallDebugService.name );

    constructor(
        @InjectModel( InboundCampaignSchema.name ) private readonly inboundCampaign: Model<any>,
        @InjectModel( CallQueueSchema.name ) private readonly callQueue: Model<any>,
        @InjectModel( CallQueueAgentSchema.name ) private readonly callQueueAgent: Model<any>,
        @InjectModel( ExtensionSchema.name ) private readonly extension: Model<ExtensionDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<any>,
        @InjectModel( UserSchema.name ) private readonly user: Model<any>,
        @InjectModel( AgentLiveReportSchema.name ) private readonly agentLiveReport: Model<any>,
        @InjectModel( AgentCampaignLoginSchema.name ) private readonly agentCampaignLogin: Model<any>,
        private readonly commonFn: CommonFunctions,
    ) {}

    private normalizeQueueUuids ( raw: any ): string[] {
        if ( !raw ) {
            return [];
        }
        const arr = Array.isArray( raw ) ? raw : [ raw ];
        return arr.map( ( x ) => String( x ) ).filter( Boolean );
    }

    private parsePipeFields ( body: string ): Record<string, string> {
        const out: Record<string, string> = {};
        if ( !body ) {
            return out;
        }
        for ( const line of body.split( /\r?\n/ ) ) {
            const parts = line.split( "|" );
            if ( parts.length >= 2 ) {
                const k = parts[ 0 ].trim().toLowerCase();
                const v = parts.slice( 1 ).join( "|" ).trim();
                if ( k ) {
                    out[ k ] = v;
                }
            }
        }
        return out;
    }

    private extractFsAgentState ( body: string ): { status: string; state: string; fields: Record<string, string> } {
        const fields = this.parsePipeFields( body );
        let status = fields.status || fields[ "agent status" ] || "";
        let state = fields.state || fields[ "agent state" ] || "";
        if ( !status ) {
            const m = body.match( /\bstatus\b\s*[:|]\s*([^\s|]+)/i );
            if ( m ) {
                status = m[ 1 ];
            }
        }
        if ( !state ) {
            const m = body.match( /\bstate\b\s*[:|]\s*([^\s|]+)/i );
            if ( m ) {
                state = m[ 1 ];
            }
        }
        return { status: status.trim(), state: state.trim(), fields };
    }

    private extractAgentStateFromList ( agentListRaw: string, agentId: string ): { status: string; state: string; fields: Record<string, string> } {
        const lines = ( agentListRaw || "" ).split( /\r?\n/ );
        const headerLine = lines.find( ( l ) => l.includes( "name|" ) && l.includes( "|status|" ) && l.includes( "|state" ) ) || lines.find( ( l ) => l.trim().startsWith( "name|" ) );
        const agentLine = lines.find( ( l ) => l.trim().startsWith( agentId ) );
        if ( !headerLine || !agentLine ) {
            return { status: "", state: "", fields: {} };
        }
        const headers = headerLine.split( "|" ).map( ( h ) => h.trim().toLowerCase() );
        const values = agentLine.split( "|" ).map( ( v ) => v.trim() );
        const fields: Record<string, string> = {};
        headers.forEach( ( h, i ) => {
            if ( h ) {
                fields[ h ] = values[ i ] || "";
            }
        } );
        return {
            status: fields.status || "",
            state: fields.state || "",
            fields,
        };
    }

    private readCallCenterXmlExcerpt ( agentId: string, queueIds: string[] ): { path: string; excerpt: string; error?: string } {
        const dir = process.env.CALL_CENTER_DIRECTORY || "./opt/caching/callcenter/";
        const filePath = path.join( dir.replace( /[/\\]+$/, "" ), "CALL_CENTER.xml" );
        try {
            const full = fs.readFileSync( filePath, "utf8" );
            const lines = full.split( /\r?\n/ );
            const picked: string[] = [];
            for ( const line of lines ) {
                const l = line.trim();
                if ( !l ) {
                    continue;
                }
                if ( l.includes( agentId ) || queueIds.some( ( q ) => l.includes( q ) ) ) {
                    picked.push( line );
                }
            }
            const excerpt = picked.slice( 0, 120 ).join( "\n" );
            return { path: filePath, excerpt: excerpt || "(no matching lines for agent/queues in file)" };
        } catch ( e: any ) {
            return { path: filePath, excerpt: "", error: e?.message || "read failed" };
        }
    }

    private agentListedInFs ( agentListBody: string, agentId: string, extUsername: string, domain: string ): boolean {
        const decoded = ( agentListBody || "" ).replace( /%40/g, "@" );
        if ( decoded.includes( agentId ) ) {
            return true;
        }
        return decoded.includes( `${extUsername}@${domain}` );
    }

    async getSnapshot ( tenantUuid: string, query: { campaign_uuid: string; extension?: string; user_uuid?: string; call_queue_uuid?: string } ) {
        const { campaign_uuid, call_queue_uuid } = query;
        if ( !query.extension && !query.user_uuid ) {
            throw new BadRequestException( "Provide extension or user_uuid" );
        }

        const campaign = await this.inboundCampaign.findOne( { uuid: campaign_uuid, tenant_uuid: tenantUuid } ).populate( { path: "call_queue_details", select: "uuid name strategy timeout status for_pbx tenant_uuid" } ).lean().exec();
        if ( !campaign ) {
            throw new ForbiddenException( "Inbound campaign not found for this tenant" );
        }

        let extensionDoc: any = null;
        let userDoc: any = null;

        if ( query.extension ) {
            extensionDoc = await this.extension.findOne( { username: query.extension, tenant_uuid: tenantUuid, status: "0" } ).lean().exec();
        } else if ( query.user_uuid ) {
            userDoc = await this.user.findOne( { uuid: query.user_uuid, tenant_uuid: tenantUuid } ).lean().exec();
            if ( !userDoc ) {
                throw new BadRequestException( "User not found for tenant" );
            }
            if ( userDoc.default_extension ) {
                extensionDoc = await this.extension.findOne( { uuid: userDoc.default_extension, tenant_uuid: tenantUuid, status: "0" } ).lean().exec();
            }
        }

        if ( !extensionDoc ) {
            throw new BadRequestException( "Extension not found (check username / user default_extension)" );
        }

        const tenant = await this.tenant.findOne( { uuid: tenantUuid, status: "0" } ).lean().exec();
        if ( !tenant ) {
            throw new BadRequestException( "Tenant not found" );
        }

        const domain = String( tenant.domain || "" );
        const extUsername = String( extensionDoc.username || "" );
        const agentId = `${extUsername}.${domain}@default`;

        const allQueueUuids = this.normalizeQueueUuids( campaign.call_queue_uuid );
        if ( call_queue_uuid ) {
            if ( !allQueueUuids.includes( call_queue_uuid ) ) {
                throw new BadRequestException( "call_queue_uuid is not linked to this campaign" );
            }
        }
        const targetQueueUuids = call_queue_uuid ? [ call_queue_uuid ] : allQueueUuids;

        const queues = ( campaign as any ).call_queue_details || [];
        const queueSummaries = ( Array.isArray( queues ) ? queues : [] ).map( ( q: any ) => ( {
            uuid: q.uuid,
            name: q.name,
            strategy: q.strategy,
            timeout: q.timeout,
            status: q.status,
            for_pbx: q.for_pbx,
        } ) );

        let cqAgents: any[] = [];
        if ( allQueueUuids.length ) {
            cqAgents = await this.callQueueAgent.find( {
                tenant_uuid: tenantUuid,
                extension_uuid: extensionDoc.uuid,
                call_queue_uuid: { $in: allQueueUuids },
            } ).populate( { path: "call_queue_details", select: "name uuid strategy" } ).lean().exec();
        }

        const agentUserUuid = String( extensionDoc.user_uuid || userDoc?.uuid || "" );
        const liveReport = agentUserUuid
            ? await this.agentLiveReport.findOne( { agent_uuid: agentUserUuid, campaign_uuid } ).sort( { updatedAt: -1 } ).lean().exec()
            : null;

        const campaignLogin = agentUserUuid
            ? await this.agentCampaignLogin.findOne( { agent_uuid: agentUserUuid, campaign_uuid } ).sort( { updatedAt: -1 } ).lean().exec()
            : null;

        let agentListRaw = "";
        let agentGetRaw = "";
        let tierListRaw = "";
        let queueListRaw = "";
        let registrationsRaw = "";
        let showChannelsRaw = "";
        const queueMembersByQueue: Record<string, string> = {};

        try {
            agentListRaw = await this.commonFn.fsApiRaw( `callcenter_config agent list` );
            tierListRaw = await this.commonFn.fsApiRaw( `callcenter_config tier list` );
            queueListRaw = await this.commonFn.fsApiRaw( `callcenter_config queue list` );
            registrationsRaw = await this.commonFn.fsApiRaw( `show registrations as json` );
            showChannelsRaw = await this.commonFn.fsApiRaw( `show channels as json` );
        } catch ( e: any ) {
            this.logger.warn( `FS API batch failed: ${e?.message}` );
        }

        for ( const qu of targetQueueUuids ) {
            try {
                queueMembersByQueue[ qu ] = await this.commonFn.fsApiRaw(
                    `json {"command":"callcenter_config","data":{"arguments":"queue list members","queue_name":"${qu}@default"}}`,
                );
            } catch ( e: any ) {
                queueMembersByQueue[ qu ] = `Error: ${e?.message}`;
            }
        }

        const { status: fsStatus, state: fsState, fields: agentGetFields } = this.extractAgentStateFromList( agentListRaw, agentId );
        agentGetRaw = agentListRaw.split( /\r?\n/ ).find( ( l ) => l.trim().startsWith( agentId ) ) || "";
        const agentInList = this.agentListedInFs( agentListRaw, agentId, extUsername, domain );
        let sipRegistered = false;
        try {
            const parsedReg = JSON.parse( registrationsRaw );
            if ( parsedReg && Array.isArray( parsedReg.rows ) ) {
                sipRegistered = parsedReg.rows.some(
                    ( r: any ) =>
                        String( r.reg_user || "" ).toLowerCase() === extUsername.toLowerCase() &&
                        String( r.realm || "" ).toLowerCase() === domain.toLowerCase(),
                );
            } else if ( parsedReg && Array.isArray( parsedReg ) ) {
                sipRegistered = parsedReg.some(
                    ( r: any ) =>
                        String( r.reg_user || "" ).toLowerCase() === extUsername.toLowerCase() &&
                        String( r.realm || "" ).toLowerCase() === domain.toLowerCase(),
                );
            }
        } catch ( e ) {
            const regNeedle = `${extUsername}@${domain}`.toLowerCase();
            const regLower = registrationsRaw.toLowerCase();
            sipRegistered = regLower.includes( regNeedle ) || regLower.includes( `user/${extUsername}` );
        }

        let tierForAgent = false;
        let tierState = "";
        const tierLines = tierListRaw.split( /\r?\n/ );
        for ( const qu of targetQueueUuids ) {
            const qref = `${qu}@default`;
            const matchingLine = tierLines.find( ( line ) => line.includes( agentId ) && line.includes( qref ) );
            if ( matchingLine ) {
                tierForAgent = true;
                const parts = matchingLine.split( "|" );
                if ( parts.length >= 3 ) {
                    tierState = parts[ 2 ].trim();
                }
                break;
            }
        }

        const isCallCenterMode = queues.length > 0 && queues.every( ( q: any ) => String( q.for_pbx ) === "1" );
        const isAgentCampaignLoggedIn = campaignLogin && String( campaignLogin.login_status ) === "0";

        const xmlQueueIds = targetQueueUuids.length ? targetQueueUuids : allQueueUuids;
        const xmlInfo = this.readCallCenterXmlExcerpt( agentId, xmlQueueIds );
        
        const xmlHasQueue = xmlQueueIds.some( ( q ) => xmlInfo.excerpt.includes( `${q}@default` ) );
        const xmlHasTier = isCallCenterMode 
            ? xmlHasQueue 
            : ( xmlInfo.excerpt.includes( agentId ) && xmlHasQueue );

        const mongoQueuesLinked = allQueueUuids.length > 0;
        
        const mongoAgentOnQueue = isCallCenterMode 
            ? !!isAgentCampaignLoggedIn 
            : ( Array.isArray( cqAgents ) && cqAgents.length > 0 );

        const checklist: DebugChecklistItem[] = [];
        const push = ( id: string, label: string, pass: boolean, detail: string, severity: ChecklistSeverity, verificationCommand?: string ) =>
            checklist.push( { id, label, pass, detail, severity, verificationCommand } );

        push(
            "mongo_campaign_queue_linked",
            "Inbound campaign has call queue(s)",
            mongoQueuesLinked,
            mongoQueuesLinked ? `${allQueueUuids.length} queue(s)` : "No call_queue_uuid on campaign",
            mongoQueuesLinked ? "info" : "critical",
            `db.inbound_campaign.findOne({ uuid: "${campaign_uuid}", tenant_uuid: "${tenantUuid}" }, { call_queue_uuid: 1 })`
        );
        
        let agentOnQueueDetail = "";
        if ( isCallCenterMode ) {
            agentOnQueueDetail = isAgentCampaignLoggedIn 
                ? "Call Center Mode: Agent is dynamically logged into campaign" 
                : "Call Center Mode: Agent is NOT logged into campaign";
        } else {
            agentOnQueueDetail = mongoAgentOnQueue 
                ? `${cqAgents.length} row(s)` 
                : "No call_queue_agent — agent not assigned in DB";
        }
        
        const mongoAgentQuery = isCallCenterMode
            ? `db.agent_campaign_login.find({ agent_uuid: "${agentUserUuid}", campaign_uuid: "${campaign_uuid}" }).sort({ updatedAt: -1 }).limit(1)`
            : `db.call_queue_agent.find({ tenant_uuid: "${tenantUuid}", extension_uuid: "${extensionDoc.uuid}", call_queue_uuid: "${allQueueUuids[0]}" })`;
        push(
            "mongo_agent_on_queue",
            "Mongo call_queue_agent row for this extension + queue",
            mongoAgentOnQueue,
            agentOnQueueDetail,
            mongoAgentOnQueue ? "info" : "critical",
            mongoAgentQuery
        );
        
        push(
            "fs_agent_exists",
            "FreeSWITCH callcenter agent exists",
            agentInList,
            agentInList ? agentId : `Missing ${agentId} in agent list`,
            agentInList ? "info" : "critical",
            `fs_cli -x "callcenter_config agent list" | grep -i "${agentId}"`
        );
        push(
            "fs_agent_status_available",
            "Agent status is Available",
            fsStatus.toLowerCase() === "available",
            `status=${fsStatus || "(empty)"}`,
            fsStatus.toLowerCase() === "available" ? "info" : "critical",
            `fs_cli -x "callcenter_config agent list" # check status for "${agentId}"`
        );
        const fsStateLower = fsState.toLowerCase();
        const isWaiting = fsStateLower === "waiting";
        const stateDetail = fsStateLower === "receiving" || fsStateLower === "in a queue call"
            ? `state=${fsState} (active call/offering)`
            : `state=${fsState || "(empty)"}`;
        push(
            "fs_agent_state_waiting",
            "Agent state is Waiting (needed for longest-idle)",
            isWaiting,
            stateDetail,
            isWaiting ? "info" : "warning",
            `fs_cli -x "callcenter_config agent list" # check state for "${agentId}"`
        );

        let tierDetail = "";
        if ( tierForAgent ) {
            tierDetail = `Tier found in tier list${tierState ? ` (state=${tierState})` : ""}`;
        } else {
            tierDetail = "No tier for this agent+queue — Play/Resume usually fixes";
        }
        push(
            "fs_tier_exists",
            "Tier links agent to campaign queue",
            tierForAgent,
            tierDetail,
            tierForAgent ? "info" : "critical",
            `fs_cli -x "callcenter_config tier list" | grep -i "${agentId}"`
        );
        push(
            "fs_sip_registered",
            "SIP registration for extension@domain",
            sipRegistered,
            sipRegistered ? `Found ${extUsername}@${domain}` : `No registration for ${extUsername}@${domain}`,
            sipRegistered ? "info" : "critical",
            `fs_cli -x "show registrations as json" # match reg_user="${extUsername}" realm="${domain}"`
        );
        
        let xmlDetail = "";
        if ( xmlInfo.error ) {
            xmlDetail = `XML read: ${xmlInfo.error}`;
        } else if ( isCallCenterMode ) {
            xmlDetail = xmlHasQueue 
                ? "XML excerpt contains queue (Tiers/Agents are dynamic in Call Center mode)" 
                : "XML excerpt missing queue definition";
        } else {
            xmlDetail = xmlHasTier 
                ? "XML excerpt contains tier/queue" 
                : "XML excerpt missing tier lines (check file path / reload)";
        }
        const xmlCmd = isCallCenterMode
            ? `grep -in "${allQueueUuids[0]}@default" /opt/caching/callcenter/CALL_CENTER.xml`
            : `grep -in "${agentId}" /opt/caching/callcenter/CALL_CENTER.xml`;
        push(
            "xml_tier_matches_esl",
            "CALL_CENTER.xml mentions agent + queue",
            xmlHasTier,
            xmlDetail,
            xmlHasTier ? "info" : "warning",
            xmlCmd
        );

        const mongoLiveReady = !liveReport || ( String( liveReport.campaign_uuid ) === campaign_uuid && String( liveReport.status ) !== "4" );
        push(
            "mongo_live_report_ready",
            "Agent live report not paused (status≠4)",
            mongoLiveReady,
            liveReport ? `status=${liveReport.status}, campaign=${liveReport.campaign_uuid}` : "No agent_live_report row",
            mongoLiveReady ? "info" : "warning",
            `db.agent_live_report.find({ agent_uuid: "${agentUserUuid}", campaign_uuid: "${campaign_uuid}" }).sort({ updatedAt: -1 }).limit(1)`
        );

        const fsStateOk = fsStateLower === "waiting" || fsStateLower === "receiving" || fsStateLower === "in a queue call";
        const fsCoreOk = agentInList && fsStatus.toLowerCase() === "available" && fsStateOk && tierForAgent && sipRegistered;
        push(
            "ui_vs_fs_ready",
            "FS fully ready for inbound offer",
            fsCoreOk && mongoAgentOnQueue,
            fsCoreOk ? "Tier + Available + Waiting + SIP OK" : "UI may show ready but FS queue/SIP not ready",
            fsCoreOk ? "info" : "critical",
            "# Logic check: [fs_agent_exists && fs_agent_status_available && fs_agent_state_waiting && fs_tier_exists && fs_sip_registered && mongo_agent_on_queue]"
        );

        const failedCritical = checklist.filter( ( c ) => !c.pass && c.severity === "critical" ).length;
        const failedWarn = checklist.filter( ( c ) => !c.pass && c.severity === "warning" ).length;
        let overall: "healthy" | "degraded" | "broken" = "healthy";
        if ( failedCritical > 0 ) {
            overall = "broken";
        } else if ( failedWarn > 0 ) {
            overall = "degraded";
        }

        const summaryParts: string[] = [];
        if ( overall === "broken" ) {
            summaryParts.push( "Critical checks failed — inbound calls may abandon or not ring this agent." );
        } else if ( overall === "degraded" ) {
            summaryParts.push( "Some warnings — review state Waiting and live report pause." );
        } else {
            summaryParts.push( "All primary checks passed for this snapshot." );
        }
        if ( !tierForAgent || fsState.toLowerCase() !== "waiting" ) {
            summaryParts.push( "If agents only recover after Play/Pause: confirm POST /inbound-campaign/call-queue/resume ran (ESL tier + Waiting)." );
        }

        return {
            generatedAt: new Date().toISOString(),
            overall,
            summary: summaryParts.join( " " ),
            checklist,
            inputs: {
                tenant_uuid: tenantUuid,
                campaign_uuid,
                extension: extUsername,
                user_uuid: query.user_uuid || userDoc?.uuid,
                agent_id: agentId,
                domain,
                all_queue_uuids: allQueueUuids,
                target_queue_uuids: targetQueueUuids,
            },
            mongo: {
                campaign: { uuid: campaign.uuid, name: campaign.name, tenant_uuid: campaign.tenant_uuid, call_queue_uuid: campaign.call_queue_uuid },
                queues: queueSummaries,
                extension: { uuid: extensionDoc.uuid, username: extensionDoc.username, user_uuid: extensionDoc.user_uuid, status: extensionDoc.status },
                call_queue_agent: cqAgents,
                agent_live_report: liveReport,
                agent_campaign_login: campaignLogin,
            },
            freeswitch: {
                enable_fs: process.env.ENABLE_FS === "true",
                agent_list_excerpt: agentListRaw.split( /\r?\n/ ).filter( ( l ) => l.includes( extUsername ) && l.includes( domain ) ).slice( 0, 25 ).join( "\n" ),
                agent_get_raw: agentGetRaw,
                agent_get_parsed: agentGetFields,
                tier_list_excerpt: tierListRaw.split( /\r?\n/ ).filter( ( l ) => l.includes( extUsername ) || targetQueueUuids.some( ( q ) => l.includes( q ) ) ).slice( 0, 40 ).join( "\n" ),
                queue_list_excerpt: queueListRaw.split( /\r?\n/ ).filter( ( l ) => allQueueUuids.some( ( q ) => l.includes( q ) ) ).slice( 0, 30 ).join( "\n" ),
                queue_members_by_queue: queueMembersByQueue,
                registrations_excerpt: registrationsRaw.length > 8000 ? registrationsRaw.slice( 0, 8000 ) + "\n...(truncated)" : registrationsRaw,
                show_channels_excerpt: showChannelsRaw.length > 12000 ? showChannelsRaw.slice( 0, 12000 ) + "\n...(truncated)" : showChannelsRaw,
            },
            call_center_xml: xmlInfo,
        };
    }

    async getFormOptions ( tenantUuid: string, query: { campaign_uuid?: string } ) {
        // Fetch active campaigns under this tenant
        const campaigns = await this.inboundCampaign.find( 
            { tenant_uuid: tenantUuid, status: "0" }, 
            { _id: 0, uuid: 1, name: 1 } 
        ).lean().exec();

        // Fetch extensions under this tenant
        const extensions = await this.extension.find( 
            { tenant_uuid: tenantUuid, status: "0" }, 
            { _id: 0, uuid: 1, username: 1 } 
        ).lean().exec();

        // Fetch active users under this tenant
        const users = await this.user.find( 
            { tenant_uuid: tenantUuid, status: "0" }, 
            { _id: 0, uuid: 1, username: 1, fullname: 1 } 
        ).lean().exec();

        // Fetch queues linked to this campaign or all queues under the tenant
        let queues = [];
        if ( query.campaign_uuid ) {
            const campaign = await this.inboundCampaign.findOne( { uuid: query.campaign_uuid, tenant_uuid: tenantUuid } ).lean().exec();
            if ( campaign && campaign.call_queue_uuid ) {
                const queueUuids = Array.isArray( campaign.call_queue_uuid ) ? campaign.call_queue_uuid : [ campaign.call_queue_uuid ];
                queues = await this.callQueue.find( 
                    { uuid: { $in: queueUuids }, tenant_uuid: tenantUuid }, 
                    { _id: 0, uuid: 1, name: 1 } 
                ).lean().exec();
            }
        } else {
            queues = await this.callQueue.find( 
                { tenant_uuid: tenantUuid }, 
                { _id: 0, uuid: 1, name: 1 } 
            ).lean().exec();
        }

        return {
            campaigns,
            extensions,
            users,
            queues,
        };
    }
}
