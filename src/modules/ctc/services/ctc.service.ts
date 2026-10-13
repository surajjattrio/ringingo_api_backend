import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { CreateCtcDto } from "../dto/create-ctc.dto";
import { CtcCallDocument, CtcCallSchema } from "../schema/ctc.schema";

@Injectable()

export class CtcService {

    /*
    @Usage : To load extension/trunk/tenant schema, the ctc call log schema and the common ESL/DB helpers
    */

    constructor(
        @InjectModel(ExtensionSchema.name) private readonly extension: Model<ExtensionDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(CtcCallSchema.name) private readonly ctc_call: Model<CtcCallDocument>,
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage          : Look up a trunk by uuid and make sure it is actually assigned to this tenant before
                       letting a call route through it (a trunk's tenant_uuid can be an array - shared trunks).
    @Param trunk_uuid   : the trunk to resolve
    @Param tenant_uuid  : the tenant making the request
    @return Object      : { ok:true, name } on success, { ok:false, status, error } otherwise
    */

    private async resolveTrunk(trunk_uuid: string, tenant_uuid: string): Promise<{ ok: boolean, name?: string, status?: number, error?: string }> {
        const trunkRow: any = await this.trunk.findOne({ uuid: trunk_uuid }).exec();
        if (!trunkRow) {
            return { ok: false, status: HttpStatus.NOT_FOUND, error: "trunk not found" };
        }
        const assignedTenants: string[] = Array.isArray(trunkRow.tenant_uuid)
            ? trunkRow.tenant_uuid
            : [trunkRow.tenant_uuid].filter(Boolean);
        if (!assignedTenants.includes(tenant_uuid)) {
            return { ok: false, status: HttpStatus.FORBIDDEN, error: "trunk is not assigned to this tenant" };
        }
        return { ok: true, name: trunkRow.name };
    }

    /*
    @Usage : Bridge a tenant agent (own SIP extension, or a number dialled out on a tenant trunk) straight
             to a customer number over ESL - the agent's registration/login state is never checked, matching
             how mod_callcenter style click-to-call already behaves on the extension leg.
    @Param createCtcDto : agent_number/agent_type(/agent_trunk)/customer_number/... (tenant_uuid injected from JWT)
    @return Object      : Success / Error
    */

    async dial(createCtcDto: CreateCtcDto) {
        const {
            agent_number, agent_type, agent_trunk, agent_caller_id,
            customer_number, customer_trunk, customer_caller_id,
            tenant_uuid,
        } = createCtcDto;
        const autoAnswer = agent_type === "extension" && String(createCtcDto.auto_answer) === "1";

        if (!tenant_uuid) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.FORBIDDEN, null, "tenant_uuid missing on session");
        }
        if (!agent_number || !customer_number) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, null, "agent_number and customer_number are required");
        }
        if (!["extension", "trunk"].includes(agent_type)) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, null, "agent_type must be extension or trunk");
        }

        const tenantRow: any = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1, _id: 0 }).exec();
        const domain = tenantRow?.domain;
        if (!domain) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, null, "tenant domain is not configured");
        }

        let agentDial = "";
        let agentCid = agent_caller_id || customer_number;
        let agentExtensionUuid = "";
        let agentUserUuid = "";

        if (agent_type === "extension") {
            // Extension must belong to THIS tenant - never trust a bare username across tenants.
            const ext: any = await this.extension.findOne({ username: agent_number, tenant_uuid }).exec();
            if (!ext) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, null, `extension ${agent_number} not found for this tenant`);
            }
            // Same dial target mod_callcenter/other internal transfers use - rings the device directly,
            // regardless of whether the extension shows as registered/logged-in right now.
            agentDial = `user/${ext.username}@${domain}`;
            if (!agent_caller_id && ext.caller_id_number) {
                agentCid = String(ext.caller_id_number);
            }
            agentExtensionUuid = String(ext.uuid || "");
            agentUserUuid = String(ext.user_uuid || "");
        } else {
            if (!agent_trunk) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, null, "agent_trunk is required when agent_type is trunk");
            }
            const agentTrunkRow = await this.resolveTrunk(agent_trunk, tenant_uuid);
            if (!agentTrunkRow.ok) {
                return this.commonDbFn.sendResponseWithMessage(agentTrunkRow.status, null, agentTrunkRow.error);
            }
            agentDial = `sofia/gateway/${agentTrunkRow.name}/${agent_number}`;
        }

        // Customer leg: an explicit trunk pick dials straight out on that gateway; otherwise it routes
        // through the tenant's own outbound dialplan (Outgoing Rules) via a loopback into that tenant's
        // domain context - the same path a normal extension-dialled call takes.
        let customerDial = `loopback/${customer_number}/${domain}`;
        if (customer_trunk) {
            const customerTrunkRow = await this.resolveTrunk(customer_trunk, tenant_uuid);
            if (!customerTrunkRow.ok) {
                return this.commonDbFn.sendResponseWithMessage(customerTrunkRow.status, null, customerTrunkRow.error);
            }
            customerDial = `sofia/gateway/${customerTrunkRow.name}/${customer_number}`;
        }
        const customerCid = customer_caller_id || "";

        let timeout = Number(createCtcDto.timeout) || 40;
        timeout = Math.min(Math.max(timeout, 5), 180);

        const callUuid = randomUUID();
        const ctcId = randomUUID().replace(/-/g, "").slice(0, 16);

        // Every CTC call is recorded, always - no opt-out. "record_path" is only informational
        // here (harmless single-token value) - the actual recording is started right after
        // origination via a separate "uuid_record start" call below. Passing
        // "execute_on_answer=record_session <path>" inline in the {vars} block breaks FreeSWITCH's
        // origination string parser (its value contains a space) and makes the WHOLE
        // originate fail with DESTINATION_OUT_OF_ORDER / "Parse Error!" - confirmed on FS 1.10.12.
        const recordDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const recordPath = `/usr/local/freeswitch/recordings/${domain}/${recordDate}/${callUuid}.wav`;
        // Force mono - some extensions default to record_stereo=true (see the directory XML),
        // which makes uuid_record try to write 2 channels into a 1-channel .wav and fail with
        // "has more channels (2) than limit (1)".
        const recordVars = [`record_path=${recordPath}`, "record_stereo=false"];

        const aVars = [
            `origination_uuid=${callUuid}`,
            agentCid ? `origination_caller_id_number=${agentCid}` : "",
            agentCid ? `origination_caller_id_name=${agentCid}` : "",
            `originate_timeout=${timeout}`,
            "ignore_early_media=true",
            "bridge_early_media=true",
            "hangup_after_bridge=true",
            "continue_on_fail=false",
            "sip_h_P-ctc=1",
            `sip_h_P-ctc-id=${ctcId}`,
            `sip_h_P-ctc-tenant=${tenant_uuid}`,
            `sip_h_P-ctc-agent-type=${agent_type}`,
            autoAnswer ? "sip_h_P-ctc-auto-answer=1" : "",
            // Same headers the CDR writer (cdrs_posting.py) already reads for every other call
            // type - without tenant_uuid a CTC call's CDR row would have no tenant at all, and
            // "P-campaign_uuid=CTC" makes the CDR/recording reports show "CTC" as the Campaign
            // (a literal, non-existent campaign uuid - see cdrs_posting.py's call_mode fix).
            `sip_h_P-tenant_uuid=${tenant_uuid}`,
            "sip_h_P-campaign_uuid=CTC",
            // cdrs_posting.py already falls back to these when the native FreeSWITCH
            // variable_extension_uuid/variable_user_uuid aren't present on the CDR event
            // (seen on a NO_USER_RESPONSE hangup) - keeps the agent identifiable even on a miss.
            agentExtensionUuid ? `sip_h_P-extension_uuid=${agentExtensionUuid}` : "",
            agentUserUuid ? `sip_h_P-user_uuid=${agentUserUuid}` : "",
            // Lets cdrs_posting.py use the SAME uuid for the CDR row that the recording file is
            // named with, instead of FreeSWITCH's native bridge_uuid (the other leg's uuid).
            `sip_h_P-ctc-call-uuid=${callUuid}`,
        ].filter(Boolean).join(",");

        const bVars = [
            customerCid ? `origination_caller_id_number=${customerCid}` : "",
            customerCid ? `origination_caller_id_name=${customerCid}` : "",
            `originate_timeout=${timeout}`,
            "ignore_early_media=false",
            "sip_h_P-ctc=1",
            `sip_h_P-ctc-id=${ctcId}`,
            `sip_h_P-tenant_uuid=${tenant_uuid}`,
            "sip_h_P-campaign_uuid=CTC",
            `sip_h_P-ctc-call-uuid=${callUuid}`,
        ].filter(Boolean).join(",");

        const callfirst = createCtcDto.callfirst === "customer" ? "customer" : "agent";
        const [firstDial, firstVars, secondDial, secondVars] = callfirst === "customer"
            ? [customerDial, bVars, agentDial, aVars]
            : [agentDial, aVars, customerDial, bVars];

        const command = `bgapi originate {${firstVars},${recordVars.join(",")}}${firstDial} &bridge({${secondVars}}${secondDial})`;
        Logger.debug(`CTC dial command: ${command}`);

        const raw = await this.commonFn.fsApiRaw(command);
        const firstLine = (raw || "").split("\n")[0] || "";
        const ok = !!raw && !/-ERR/i.test(firstLine) && !/^err\b/i.test(firstLine.trim());

        const jobMatch = /Job-UUID:\s*([0-9a-f-]+)/i.exec(raw || "");
        const job_uuid = jobMatch ? jobMatch[1] : "";

        if (ok) {
            // Fire-and-forget: give the channel a moment to actually exist in the switch
            // (bgapi just queued the job), then start recording on it via ESL - separate
            // from the originate string itself, see the recordVars comment above.
            setTimeout(() => {
                this.commonFn
                    .fsApiRaw(`uuid_record ${callUuid} start ${recordPath}`)
                    .then((res) => Logger.debug(`CTC uuid_record start: ${res}`))
                    .catch((err) => Logger.error(`CTC uuid_record start failed`, err?.message));
            }, 1500);
        }

        try {
            const logDoc = new this.ctc_call({
                tenant_uuid, agent_number, agent_type, agent_trunk: agent_trunk || "",
                customer_number, customer_trunk: customer_trunk || "", callfirst, timeout,
                record: true, recording_path: recordPath, ok,
                message: ok ? "Call placed" : (raw || "FreeSWITCH did not accept the call").trim().slice(0, 300),
                job_uuid, command: command.slice(0, 500),
            });
            await logDoc.save();
        } catch (err: any) {
            Logger.error(`Failed to save CTC call log`, err?.message);
        }

        if (!ok) {
            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.BAD_GATEWAY,
                { ok, job_uuid, call_uuid: callUuid },
                (raw || "FreeSWITCH did not accept the call").trim() || "Call failed",
            );
        }
        return this.commonDbFn.sendResponseWithMessage(
            HttpStatus.OK,
            { ok, job_uuid, call_uuid: callUuid },
            `call-first ${callfirst}: ringing first leg, then bridging`,
        );
    }

    /*
    @Usage         : Recent click-to-call dial attempts for this tenant (newest first)
    @Param tenant_uuid : tenant to scope the history to
    @Param queryParams : optional limit
    @return Object : Array of ctc call attempts
    */

    async history(tenant_uuid: string, queryParams: any) {
        if (!tenant_uuid) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.FORBIDDEN, null, "tenant_uuid missing on session");
        }
        const limit = Math.min(Number(queryParams?.limit) || 50, 200);
        const rows = await this.ctc_call
            .find({ tenant_uuid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, rows);
    }
}
