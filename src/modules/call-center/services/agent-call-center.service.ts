import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as moment from 'moment-timezone';
import { randomUUID } from "crypto";
import { deleteMethod, patchMethod, putMethod } from "src/global_constant";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "src/modules/lead-management/schema/leads-in-queue.schema";
import { NotesDocument, NotesSchema } from "src/modules/notes/schema/notes.schema";
import { LeadSkipDto } from "../dto/lead-skip.dto";
import { ResumeDto } from "../dto/resume.dto";
import { AutoCampaignOriginateDocument, AutoCampaignOriginateSchema } from "../schema/auto-campaign-originate.schema";
import { LeadOriginateDocument, LeadOriginateSchema } from "../schema/lead-originate.schema";
import { PauseDto } from "../dto/pause.dto";
import { CallerIdSchema, callerIdDocument } from "src/modules/caller-id-group/schema/caller-ids.schema";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { AgentLoginLogoutReportDto } from "../dto/agent-login-logout-report.dto";
import { AgentLoginLogoutDocument, AgentLoginLogoutSchema } from "../schema/agent-login-logout.schema";
import { AgentCampaignReportDocument, AgentCampaignReportSchema } from "../schema/agent-campaign-report.schema";
import { AgentStatusForNewCall } from "../dto/agent-status-for-new-call.dto";
import { AgentLiveReportDto } from "../dto/agent-live-report.dto";
import { AgentLiveReportSchema } from "../schema/agent-live-report.schema";
import { UpdateAgentLiveReportDto } from "../dto/update-agent-live-report.dto";
import { InboundCampaignDocument, InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { DialLevelDto } from "../dto/dial-level.dto";
import { PredictiveCalculationDocument, PredictiveCalculationSchema } from "src/modules/campaigns/inbound-campaign/schema/predictive-calculation.schema";
import { UpdateLeadStatusSentDto } from "../dto/update-lead-status-sent.dto";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { LeadReportDocument, LeadReportSchema } from "../schema/lead-report.schema";
import { DncDocument, DncSchema } from "src/modules/dnc/schema/dnc.schema";
import { BreakcodeDocument, BreakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";
import { LeadStatusLeadManagementDto } from "../dto/lead-status-lead-management";
import { CampaignStaticsDocument, CampaignStaticsSchema } from "../schema/campaign-statistics.schema";
import { InboundCustomerRingingDocument, InboundCustomerRingingSchema } from "../schema/inbound-customer-ringing.schema";
import { OutboundCustomerRingingDocument, OutboundCustomerRingingSchema } from "../schema/outbound-customer-ringing.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import * as xml2js from "xml2js";
import { IdleStateAgentDocument, IdleStateAgentSchema } from "../schema/idle-state-agent.schema";
//import { AcwAgentDocument, AcwAgentSchema } from "../schema/acw-agent.schema";
import { ManagerRoleDocument, ManagerRoleSchema } from "src/modules/manager-role/schema/manager-role.schema";
import { RinggroupDocument, RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { FollowUpDocument, FollowUpSchema } from "src/modules/follow-up/schema/follow-up.schema";
import { RealtimReportCountManagementDocument, RealtimReportCountManagementSchema } from 'src/modules/call-center/schema/realtime-report-count-management.schema';
import { RealtimReportInboundCountManagementDocument, RealtimReportInboundCountManagementSchema } from 'src/modules/call-center/schema/realtime-report-inbound-count-management.schema';
import { CreateInboundBlockCampaignAgentDto } from "src/modules/campaigns/block-inbound-campaign/dto/create-inbound-block-campaign-agent.dto";
import { BlockInboundCampaignDocument, BlockInboundCampaignSchema } from "src/modules/campaigns/block-inbound-campaign/schema/block-inbound-campaign.schema";
import { WebformDocument, WebformSchema } from "src/modules/webform/schema/webform.schema";
const { Mutex } = require('async-mutex');
const mutex = new Mutex();
import { Whatsapp_available_agentDocument, Whatsapp_available_agentSchema } from 'src/modules/agent/schema/whatsapp_available_agent.schema';
import { MessagingChannelDocument, MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueDocument, MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
// import { ArchieveWhatsappMessaggeDto } from "../dto/archieve_whataspp_message.dto";
import { WhatsappmessageDocument, WhatsappmessageSchema } from "src/modules/whatsapp-message/schema/whatsappmessage.schema";
import { ArcheiveWhatsappmessageSchema, ArchieveWhatsappmessageDocument } from "../schema/archieve_whatsapp_message.schema";
import { WhatsappsyncDocument, WhatsappsyncSchema } from "src/modules/whatsapp-sync/schema/whatsappmsync.schema";
import { AgentCampaignLoginDocument, AgentCampaignLoginSchema } from "../schema/agent-campaign-login.schema";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { SocketService } from "src/modules/websockets/websockets.gateway";
import { OmnichannelsyncDocument, OmnichannelsyncSchema } from "src/modules/omnichannel-sync/schema/omnichannelsync.schema";
import { OmnichannelmessageDocument, OmnichannelmessageSchema, omnichannelmessageSchema } from "src/modules/omnichannel-message/schema/omnichannelmessage.schema";
import { ArcheiveOmnichannelmessageSchema } from "../schema/archieve_omnichannel_message.schema";
import { ArchieveOmniMessaggeDto } from "../dto/archive_omni_message.dto";
import { OmniChannelReportDocument, OmniChannelReportSchema } from "src/modules/omni-channel-report/schema/omni-channel-report.schema";
import { UserRoleDocument, UserRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { WebhookService } from "src/modules/webhook/services/webhook.service";

@Injectable()
export class AgentCallCenterService {
    private leadUUIDs: any[] = [];
    /*
    @Usage              : To load outbound campaign schema and other libraries
    @Param @InjectModel : It will outbound campaign schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [outbound_campaign,commonDbFn]
    */

    private storedCallerIDs = [];
    private storedDates = [];
    private dispositionDetails = [];


    constructor(
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(NotesSchema.name) private readonly notes: Model<NotesDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel(AutoCampaignOriginateSchema.name) private readonly auto_campaign_originate: Model<AutoCampaignOriginateDocument>,
        @InjectModel(LeadOriginateSchema.name) private readonly lead_originate: Model<LeadOriginateDocument>,
        @InjectModel(CallerIdSchema.name) private readonly caller_ids: Model<callerIdDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        @InjectModel(AgentLoginLogoutSchema.name) private readonly agent_login_logout_report: Model<AgentLoginLogoutDocument>,
        @InjectModel(AgentCampaignReportSchema.name) private readonly agent_campaign_report: Model<AgentCampaignReportDocument>,
        @InjectModel(AgentLiveReportSchema.name) private readonly agent_live_report: Model<AgentCampaignReportDocument>,
        @InjectModel(InboundCampaignSchema.name) private readonly inbound_campaign: Model<InboundCampaignDocument>,
        @InjectModel(PredictiveCalculationSchema.name) private readonly predictive_calculation: Model<PredictiveCalculationDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        @InjectModel(LeadReportSchema.name) private readonly lead_report: Model<LeadReportDocument>,
        @InjectModel(BreakcodeSchema.name) private readonly breakcode: Model<BreakcodeDocument>,
        @InjectModel(DncSchema.name) private readonly dnc: Model<DncDocument>,
        @InjectModel(CampaignStaticsSchema.name) private readonly campaign_statistics: Model<CampaignStaticsDocument>,
        @InjectModel(InboundCustomerRingingSchema.name) private readonly inbound_customer_ringing: Model<InboundCustomerRingingDocument>,
        @InjectModel(OutboundCustomerRingingSchema.name) private readonly outbound_customer_ringing: Model<OutboundCustomerRingingDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(IdleStateAgentSchema.name) private readonly idle_state_agent: Model<IdleStateAgentDocument>,
        @InjectModel(ManagerRoleSchema.name) private readonly manager_role: Model<ManagerRoleDocument>,
        @InjectModel(RinggroupSchema.name) private readonly ring_group: Model<RinggroupDocument>,
        @InjectModel(FollowUpSchema.name) private readonly follow_up: Model<FollowUpDocument>,
        @InjectModel(RealtimReportCountManagementSchema.name) private readonly realtime_report_count_management: Model<RealtimReportCountManagementDocument>,
        @InjectModel(RealtimReportInboundCountManagementSchema.name) private readonly realtime_report_inbound_count_management: Model<RealtimReportInboundCountManagementDocument>,
        @InjectModel(BlockInboundCampaignSchema.name) private readonly block_inbound_campaign: Model<BlockInboundCampaignDocument>,
        @InjectModel(WebformSchema.name) private readonly webform: Model<WebformDocument>,
        @InjectModel(Whatsapp_available_agentSchema.name) private whatsapp_available_agent: Model<Whatsapp_available_agentDocument>,
        @InjectModel(MessagingChannelSchema.name) private messaging_channel: Model<MessagingChannelDocument>,
        @InjectModel(MessagingQueueSchema.name) private messaging_queue: Model<MessagingQueueDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(UserRoleSchema.name) private readonly user_role: Model<UserRoleDocument>,
        @InjectModel(WhatsappmessageSchema.name) private readonly whatsappmessage: Model<WhatsappmessageDocument>,
        @InjectModel(ArcheiveWhatsappmessageSchema.name) private readonly archievewhatsappmessage: Model<ArchieveWhatsappmessageDocument>,
        @InjectModel(WhatsappsyncSchema.name) private readonly whatsapp_sync: Model<WhatsappsyncDocument>,
        @InjectModel(AgentCampaignLoginSchema.name) private readonly agent_campaign_login: Model<AgentCampaignLoginDocument>,
        @InjectModel(ExtensionSchema.name) private readonly extension: Model<ExtensionDocument>,
        // @InjectModel(AcwAgentSchema.name) private readonly acw_agent: Model<AcwAgentDocument>,
        @InjectModel(OmnichannelsyncSchema.name) private readonly omnichannelSync: Model<OmnichannelsyncDocument>,
        // @InjectModel( ArcheiveWhatsappmessageSchema.name ) private readonly archievewhatsappmessage: Model<ArchieveWhatsappmessageDocument>,
        @InjectModel(ArcheiveOmnichannelmessageSchema.name) private readonly archieveomnichannelmessage: Model<ArcheiveOmnichannelmessageSchema>,
        @InjectModel(OmnichannelmessageSchema.name) private readonly omnichannelMessage: Model<OmnichannelmessageDocument>,
        @InjectModel(OmniChannelReportSchema.name) private readonly omnichannel_report: Model<OmniChannelReportDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        private readonly socketService: SocketService,
        private readonly webhookService: WebhookService,
    ) { }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of outbound campaign with data
    */

    async findAll(queryParams) {
        const { manager_uuid, assigned_manager_role, tenant_uuid } = queryParams;
        let finalArray = {};
        if (manager_uuid != "" && manager_uuid != undefined && assigned_manager_role != undefined) {
            finalArray = await this.getCampaignsForManagerAgent(assigned_manager_role, tenant_uuid, manager_uuid);
            if (!finalArray) finalArray = {};
        } else {
            let outboundCampaigns = await this.commonDbFn.findAllWithPagination(this.outbound_campaign, queryParams, "", "", { _id: -1 }, true, true);
            let inboundCampaigns = await this.commonDbFn.findAllWithPagination(this.inbound_campaign, queryParams, "", "", { _id: -1 }, true, true);
            let blendedCampaigns = await this.commonDbFn.findAllWithPagination(this.blended_campaign, queryParams, "", "", { _id: -1 }, true, true);

            if (outboundCampaigns.statusCode == 200) {
                delete outboundCampaigns.statusCode;
                finalArray["outbound_campaign"] = outboundCampaigns.data;
            }

            if (inboundCampaigns.statusCode == 200) {
                delete inboundCampaigns.statusCode;
                finalArray["inbound_campaign"] = inboundCampaigns.data;
            }

            if (blendedCampaigns.statusCode == 200) {
                delete blendedCampaigns.statusCode;
                finalArray["blended_campaign"] = blendedCampaigns.data;
            }
        }
        let statusCode = (finalArray["outbound_campaign"] != undefined && finalArray["outbound_campaign"].length == 0) && (finalArray["inbound_campaign"] != undefined && finalArray["inbound_campaign"].length == 0) && (finalArray["blended_campaign"] != undefined && finalArray["blended_campaign"].length == 0) ? HttpStatus.NOT_FOUND : HttpStatus.OK;
        return this.commonDbFn.sendResponseWithMessage(statusCode, finalArray);
    }

    /*
    @Usage             : To get lead one by one from queue
    @Param queryParams : Logged in user details and other params
    @return Object     : Array of an object with total count of leads with data
    */

    // async getCampaignLeads(queryParams) {
    //     let checkRole: any = [], result, statusCode;
    //     let populateFields = [{ path: "outbound_campaign_details", select: "number_masking -_id -uuid" }, { path: "lead_details", select: "-_id" }];
    //     //Check role type
    //     let { role, tenant_uuid, campaign_uuid, campaign_mode, uuid } = queryParams;
    //     if (role == "agent") {
    //         checkRole.push({ campaign_uuid, tenant_uuid, resend_lead_time: { $ne: null }, lead_sent: "1" });
    //     }

    //     if (campaign_mode != "" && campaign_mode != undefined && campaign_mode == "2") {
    //         // checkRole.push({ skip : { $ne: true } } , { agent_uuid : { $ne: uuid } });
    //         checkRole.push({ agent_uuid: { $ne: uuid } });
    //     }

    //     try {
    //         //Check for retries lead
    //         Logger.debug(`Fetching data from role : ${role} with ${JSON.stringify(checkRole)}`);

    //         result = await this.leads_in_queue.findOne({ $and: checkRole }).populate(populateFields).sort({ _id: 1 }).limit(1).exec();

    //         if (result != null) {

    //             //Check resend_lead_time passed from current time or not
    //             //let currentDateTime: any = new Date();
    //             //console.log(currentDateTime);
    //             let currentDateTimestamp = new Date().getTime();
    //             let resendDateTimestamp = new Date(result.resend_lead_time).getTime();

    //             if (currentDateTimestamp >= resendDateTimestamp) {
    //                 Logger.debug(`Sending retries lead to campaign ${campaign_uuid}`);
    //             } else {
    //                 delete checkRole[0].resend_lead_time;
    //                 checkRole.push({ resend_lead_time: { $eq: undefined } });
    //                 result = await this.leads_in_queue.findOne({ $and: checkRole }).populate(populateFields).sort({ _id: 1 }).limit(1).exec();
    //             }
    //         } else {
    //             delete checkRole[0].resend_lead_time;
    //             checkRole.push({ resend_lead_time: { $eq: undefined } });
    //             result = await this.leads_in_queue.findOne({ $and: checkRole }).populate(populateFields).sort({ _id: 1 }).limit(1).exec();
    //         }

    //         if (result != null) {
    //             Logger.debug(`One lead sent to campaign ${campaign_uuid}`);
    //             try {

    //                 //Append phone code if phone code not blank
    //                 if (result?.lead_details[0]?.phone_code != "") {
    //                     result.lead_details[0].phone_number = result.lead_details[0].phone_code.concat(result.lead_details[0].phone_number);
    //                 }

    //                 let leadData = await this.leads_in_queue.updateOne({ lead_management_uuid: result.lead_management_uuid, campaign_uuid: result.campaign_uuid, tenant_uuid }, { lead_sent: "0" }).exec();
    //                 if (leadData.matchedCount == 0 && leadData.modifiedCount == 0) {
    //                     Logger.error(`Unable to update data on where condition`);
    //                 } else {
    //                     Logger.debug(`Successfully updated lead_sent status`);
    //                 }
    //             } catch (error) {
    //                 Logger.error(`Unable to update lead_sent status`, error.message);
    //             }
    //         }

    //         statusCode = result != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    //         result = result != null ? result : "No more lead found from this campaign";
    //     } catch (error) {
    //         Logger.debug(`Error in fetching lead from queue`, error.message);
    //     }
    //     return this.commonDbFn.sendResponseWithMessage(statusCode, result);

    //     /*if (checkRole.length == 0) { checkRole = {} };
    //     Logger.debug(`Fetching data from role : ${role} with ${JSON.stringify(checkRole)}`);

    //     result = await this.leads_in_queue.findOne({ $and: checkRole }).populate(populateFields).sort({ _id: 1 }).limit(1).exec();

    //     if (result != null) {
    //         Logger.debug(`One lead sent to campaign ${campaign_uuid}`);
    //     }
    //     statusCode = result != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    //     result = result != null ? result : "No more lead found from this campaign";
    //     return this.commonDbFn.sendResponseWithMessage(statusCode, result);*/
    // }

    // async getCampaignLeads(queryParams) {
    //     let statusCode;
    //     const populateFields = [
    //         { path: "outbound_campaign_details", select: "number_masking -_id -uuid" },
    //         { path: "lead_details", select: "-_id" }
    //     ];

    //     const {
    //         role,
    //         tenant_uuid,
    //         campaign_uuid,
    //         campaign_mode,
    //         uuid: agent_uuid
    //     } = queryParams;

    //     try {
    //         Logger.debug(
    //             `Fetching campaign leads | role=${role} campaign=${campaign_uuid}`
    //         );

    //         /** -------------------------------
    //          * Base query
    //          * ------------------------------- */
    //         const query: any = {
    //             tenant_uuid,
    //             campaign_uuid,
    //             lead_sent: { $in: ["1", 1] }, // handle string/number mismatch
    //             $or: [
    //                 // Retry leads whose resend time has passed
    //                 { resend_lead_time: { $lte: new Date() } },
    //                 // Fresh leads
    //                 { resend_lead_time: { $exists: false } },
    //                 { resend_lead_time: null }
    //             ]
    //         };

    //         /** -------------------------------
    //          * Resume logic for reloads
    //          * Check if agent already has an active lead lock
    //          * ------------------------------- */
    //         if (role === "agent") {
    //             const resumeLead: any = await this.leads_in_queue.findOne({
    //                 campaign_uuid,
    //                 tenant_uuid,
    //                 lead_sent: "0",
    //                 assigned_agent_uuid: agent_uuid
    //             }).populate(populateFields).exec();

    //             if (resumeLead) {
    //                 Logger.debug(`Resending already assigned lead from agent_uuid history to agent ${agent_uuid}`);
    //                 if (Array.isArray(resumeLead.lead_details) && resumeLead.lead_details.length > 0 && resumeLead.lead_details[0]?.phone_code) {
    //                     resumeLead.lead_details[0].phone_number = resumeLead.lead_details[0].phone_code + resumeLead.lead_details[0].phone_number;
    //                 }
    //                 return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, resumeLead);
    //             }
    //         }

    //         /** -------------------------------
    //          * Campaign mode 2
    //          * Exclude same agent safely
    //          * ------------------------------- */
    //         if (campaign_mode === "2") {
    //             query.$and = [
    //                 {
    //                     $or: [
    //                         { agent_uuid: { $ne: agent_uuid } },
    //                         { agent_uuid: { $exists: false } },
    //                         { agent_uuid: null }
    //                     ]
    //                 }
    //             ];
    //         }

    //         /** -------------------------------
    //          * Atomic fetch + update
    //          * ------------------------------- */
    //         const result: any = await this.leads_in_queue
    //             .findOneAndUpdate(
    //                 query,
    //                 { $set: { lead_sent: "0", assigned_agent_uuid: agent_uuid }}, // mark as consumed and dedicated tracking
    //                 {
    //                     sort: { _id: 1 },
    //                     new: true
    //                 }
    //             )
    //             .populate(populateFields)
    //             .exec();

    //         /** -------------------------------
    //          * No lead found
    //          * ------------------------------- */
    //         if (!result) {
    //             Logger.debug(`No lead available for campaign ${campaign_uuid}`);
    //             return this.commonDbFn.sendResponseWithMessage(
    //                 HttpStatus.NOT_FOUND,
    //                 "No more lead found from this campaign"
    //             );
    //         }

    //         /** -------------------------------
    //          * Phone number normalization
    //          * ------------------------------- */
    //         if (
    //             Array.isArray(result.lead_details) &&
    //             result.lead_details.length > 0 &&
    //             result.lead_details[0]?.phone_code
    //         ) {
    //             result.lead_details[0].phone_number =
    //                 result.lead_details[0].phone_code +
    //                 result.lead_details[0].phone_number;
    //         }

    //         Logger.debug(`Lead sent successfully | campaign=${campaign_uuid}`);

    //         statusCode = HttpStatus.OK;
    //         return this.commonDbFn.sendResponseWithMessage(statusCode, result);

    //     } catch (error) {
    //         Logger.error(`Error fetching campaign lead`, error?.message);
    //         return this.commonDbFn.sendResponseWithMessage(
    //             HttpStatus.INTERNAL_SERVER_ERROR,
    //             "Error while fetching lead"
    //         );
    //     }
    // }

    async getCampaignLeads(queryParams) {
        const populateFields = [
            { path: "outbound_campaign_details", select: "name number_masking -_id -uuid" },
            // { path: "lead_details", select: "-_id" },
            {
                path: "lead_details",
                select: "-_id",
                populate: [
                    { path: "lead_group", select: "name -_id" },
                    { path: "user", select: "username fullname user_uuid -_id" },
                    { path: "disposition", select: "name lead_status -_id" },
                    { path: "tenant", select: "tenant_name tenant_uuid -_id" },
                ]
            },
        ];

        const {
            role,
            tenant_uuid,
            campaign_uuid,
            campaign_mode,
            uuid: agent_uuid
        } = queryParams;

        try {
            Logger.debug(
                `Fetching lead | campaign=${campaign_uuid} tenant=${tenant_uuid}`
            );

            /* ---------------------------------
             * Base query (fresh + retry leads)
             * --------------------------------- */
            const query: any = {
                tenant_uuid,
                campaign_uuid,
                lead_sent: { $in: ["1", 1] },
                $and: [
                    {
                        $or: [
                            { assigned_agent_uuid: "" },
                            { assigned_agent_uuid: null },
                            { assigned_agent_uuid: { $exists: false } },
                            { assigned_agent_uuid: agent_uuid }
                        ]
                    },
                    {
                        $or: [
                            // Retry leads (time passed)
                            { resend_lead_time: { $lte: new Date() } },
                            // Fresh leads
                            { resend_lead_time: { $exists: false } },
                            { resend_lead_time: null }
                        ]
                    }
                ]
            };

            /* ---------------------------------
             * Campaign mode 2 (agent exclusion)
             * agent_uuid is ARRAY in DB
             * --------------------------------- */
            if (campaign_mode === "2" && agent_uuid) {
                query.$and.push(
                    {
                        $or: [
                            { agent_uuid: { $nin: [agent_uuid] } },
                            { agent_uuid: { $size: 0 } },
                            { agent_uuid: { $exists: false } }
                        ]
                    }
                );
            }

            let result: any = null;

            /* ---------------------------------
             * Priority Lead Assignment
             * For specific tenant: f20b1a37-6234-4151-9a71-b2f99f1578fd
             * --------------------------------- */
            if (tenant_uuid === "f20b1a37-6234-4151-9a71-b2f99f1578fd" && agent_uuid) {
                const priorityQuery = { ...query, assigned_agent_uuid: agent_uuid };
                Logger.debug(`Searching for priority lead for agent ${agent_uuid}`);
                result = await this.leads_in_queue.findOneAndUpdate(priorityQuery, { $set: { lead_sent: "0", updatedAt: new Date() } }, { sort: { _id: 1 }, returnDocument: "after" }).populate(populateFields).exec();

                if (result) {
                    Logger.debug(`Priority lead found and assigned: ${result._id}`);
                }
            }

            /* ---------------------------------
             * Normal Lead Assignment (Fallback)
             * --------------------------------- */
            if (!result) {
                result = await this.leads_in_queue.findOneAndUpdate(query, { $set: { lead_sent: "0", updatedAt: new Date() } }, { sort: { _id: 1 }, returnDocument: "after" }).populate(populateFields).exec();
            }

            /* ---------------------------------
             * No lead found
             * --------------------------------- */
            if (!result) {
                Logger.debug(`No lead found for campaign ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.NOT_FOUND,
                    "No more lead found from this campaign"
                );
            }

            /* ---------------------------------
             * Phone normalization
             * --------------------------------- */
            if (
                Array.isArray(result.lead_details) &&
                result.lead_details.length > 0 &&
                result.lead_details[0]?.phone_code
            ) {
                result.lead_details[0].phone_number =
                    result.lead_details[0].phone_code +
                    result.lead_details[0].phone_number;
            }

            Logger.debug(`Lead assigned successfully | ${result._id}`);

            /* get campaign name once from root */
            const campaignName = result?.outbound_campaign_details?.[0]?.name || "";

            /* ---------------------------------
            * FINAL: Extract + flatten + remove arrays
            * --------------------------------- */
            if (Array.isArray(result.lead_details) && result.lead_details.length > 0) {
                result.lead_details = result.lead_details.map(ld => {
                    const obj = ld.toObject ? ld.toObject() : ld;

                    const flattened = {
                        // ...obj,

                        lead_group_uuid: obj?.lead_group_uuid || "",
                        lead_group_name: obj?.lead_group?.[0]?.name || "",
                        lead_management_uuid: obj?.lead_management_uuid || "",
                        first_name: obj?.first_name || "",
                        last_name: obj?.last_name || "",
                        address: obj?.address || "",
                        city: obj?.city || "",
                        country_uuid: obj?.country_uuid || "",
                        // dob: moment.tz(obj?.dob, queryParams.timezone).format("DD-MM-YYYY") || "",
                        dob: obj?.dob || "",
                        email: obj?.email || "",
                        gender: obj?.gender === "0" ? "Male" : obj?.gender === "1" ? "Female" : "",
                        postal_code: obj?.postal_code || "",
                        phone_code: obj?.phone_code || "",
                        phone_number: obj?.phone_number || "",
                        user_uuid: obj?.user_uuid || "",
                        assigned_agent_uuid: obj?.assigned_agent_uuid || "",
                        tenant_uuid: obj?.tenant_uuid || "",
                        tenant_name: obj?.tenant?.[0]?.tenant_name || "",
                        created_flag: obj?.created_flag || "",
                        lead_uuid: obj?.lead_status || "",
                        lead_status: obj?.disposition?.[0]?.name || "",
                        campaign_uuid: obj?.campaign_uuid || "",
                        campaign_name: campaignName || "",
                        custom_phone_number: obj?.custom_phone_number || "",
                        call_count: obj?.call_count || "",
                        in_dnc: obj?.in_dnc || "",
                        retries_count: obj?.retries_count || "",
                        // createdAt: moment.tz(obj?.createdAt, queryParams.timezone).format("DD-MM-YYYY HH:mm:ss") || "",
                        // updatedAt: moment.tz(obj?.updatedAt, queryParams.timezone).format("DD-MM-YYYY HH:mm:ss") || "",
                        createdAt: obj?.createdAt || "",
                        updatedAt: obj?.updatedAt || "",
                        lead_status_1: obj?.lead_status_1 || "",
                        lead_status_2: obj?.lead_status_2 || "",
                        // full_name: obj?.user?.[0]?.fullname || "",
                        // username: obj?.user?.[0]?.username || "",
                        // campaign_name: obj?.outbound_campaign?.[0]?.name || "",
                        alternate_phone_number: obj?.alternate_phone_number || "",
                        custom_fields: obj?.custom_fields || {},
                        description: obj?.description || "",
                        manager_uuid: obj?.manager_uuid || "",
                        province: obj?.province || "",
                        role: obj?.role || "",
                        state: obj?.state || "",
                        id: obj?.id || "",
                    };

                    /* remove nested populated arrays */
                    // delete flattened.user;
                    // delete flattened.disposition;
                    // delete flattened.lead_group;
                    // delete flattened.tenant;

                    return flattened;
                });
            }

            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.OK,
                result
            );

        } catch (error) {
            Logger.error(
                `Error fetching lead from queue`,
                error?.message
            );

            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Error while fetching lead"
            );
        }
    }


    /*
    @Usage             : To get notes of given lead uuid
    @Param queryParams : Logged in user details and other params
    @return Object     : Array of an object with total count of leads with data
    */

    async getNotes(queryParams) {
        const { lead_uuid, uuid } = queryParams;
        let populateFields = [{ path: "lead-management", select: "first_name last_name -_id" }, { path: "user", select: "username -_id -uuid" }];
        let result = await this.notes.find({ $and: [{ lead_uuid }, { user_uuid: uuid }] }, { cdrs_uuid: 0, _id: 0, tenant_uuid: 0 }).populate(populateFields).exec();
        return this.commonDbFn.sendResponseWithMessage(result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, result);
    }


    /*
    @Usage         : To update lead status in lead management collection
    @Param uuid    : uuid of conference
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    // async patch(lead_management_uuid: string, body: LeadStatusLeadManagementDto) {
    //     let in_dnc = "1";
    //     let logMessages = {
    //         logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
    //         logSuccessMsg: `Lead status updated successfully by uuid : ${lead_management_uuid} \n`
    //     }
    //     console.log("bodybody", body);


    //     //Add entry in DNC , if code == DNC received in parameter
    //     if (body.code == "DNC") {
    //         in_dnc = "0";
    //         this.addEntryInDNC(body.custom_phone_number, body.campaign_uuid, body.tenant_uuid);
    //     }

    //     const result = await this.lead_management.updateOne({ lead_management_uuid }, { lead_status: body.lead_status, lead_status_1: body.lead_status_1, lead_status_2: body.lead_status_2, user_uuid: body.user_uuid, $inc: { call_count: 1 }, in_dnc }).exec();
    //     const res = logMessages;
    //     if (result.matchedCount == 0 && result.modifiedCount == 0) {
    //         Logger.error(res.logErrorMsg, deleteMethod);
    //         res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
    //     }
    //     Logger.debug(res.logSuccessMsg);
    //     res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();

    //     //Update lead_status in cdrs on last added record
    //     let lastCdrsRecordDetail = await this.cdrs.findOne({ lead_uuid: lead_management_uuid }, { uuid: 1 }).sort({ _id: -1 }).exec();
    //     let cdrsResponse = await this.cdrs.updateOne({ uuid: lastCdrsRecordDetail.uuid }, { hangup_cause: body.lead_status }).exec();
    //     if (cdrsResponse.matchedCount == 0 && cdrsResponse.modifiedCount == 0) {
    //         Logger.error(`Unable to update lead_status in cdrs collection on uuid : ${lastCdrsRecordDetail.uuid}`);
    //     } else {
    //         Logger.debug(`Lead status updated successfully in cdrs`);
    //     }

    //     //Remove lead from collection

    //     //let CampaignData: any = await this.outbound_campaign.findOne( { uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1 } ).exec();
    //     let CampaignData: any
    //     if (body.campaign_flag == "blended") {
    //         CampaignData = await this.blended_campaign.findOne({ uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1, dial_method: 1, leads_in_queue_count: 1 }).exec();
    //     } else if (body.campaign_flag == "outbound") {
    //         CampaignData = await this.outbound_campaign.findOne({ uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1, dial_method: 1, leads_in_queue_count: 1 }).exec();
    //     }
    //     let callRetriesDisposition = CampaignData?.max_retries_disposition;
    //     let leads_in_queue_count = CampaignData?.leads_in_queue_count - 1;
    //     let dial_method = CampaignData?.dial_method;
    //     if (!callRetriesDisposition.includes(body.lead_status)) {
    //         let deleteLead = await this.leads_in_queue.deleteOne({ campaign_uuid: body.campaign_uuid, lead_management_uuid }).exec();
    //         if (deleteLead.deletedCount == 0) {
    //             Logger.error(`Unable to delete combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`, deleteMethod);
    //         } else {
    //             if (body.campaign_flag == "blended") {
    //                 if (dial_method == '0' || dial_method == '2') {
    //                     let updatecampaign = await this.blended_campaign.updateOne({ uuid: body.campaign_uuid }, { leads_in_queue_count: leads_in_queue_count });
    //                 }
    //             } else if (body.campaign_flag == "outbound") {
    //                 if (dial_method == '0' || dial_method == '2') {
    //                     let updatecampaign = await this.outbound_campaign.updateOne({ uuid: body.campaign_uuid }, { leads_in_queue_count: leads_in_queue_count });
    //                 }
    //             }
    //             Logger.debug(`One record deleted from queue with combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`);
    //         }
    //     } else {
    //         Logger.debug(`Lead disposition found in call retries disposition in campaign : ${body.campaign_uuid} , so not deleting current lead`);
    //     }

    //     /*let response = await this.leads_in_queue.deleteOne({ lead_management_uuid, campaign_uuid: body.campaign_uuid }).exec();
    //     if (response.deletedCount == 0) {
    //         Logger.error(`Unable to delete combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`, deleteMethod);
    // } else {
    //          Logger.debug(`One record deleted from queue with combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`);
    // }*/

    //     //Update agent status to 0
    //     try {
    //         let flag = body.pause == "true" ? "2" : "0";
    //         let updateBody = { flag };
    //         if (flag == "2") updateBody["call_count"] = 0;

    //         let result = await this.auto_campaign_originate.updateOne({ agent_uuid: body.user_uuid, campaign_uuid: body.campaign_uuid }, updateBody).exec();
    //         if (result.modifiedCount > 0) {
    //             Logger.debug(`Agent status set to 0`);
    //         } else {
    //             Logger.debug(`Unable to set agent status`);
    //         }
    //     } catch (error) {
    //         Logger.error(`Unable to set agent status`, error.message);
    //     }

    //     this.addUpdateEntryInLeadReport(lead_management_uuid);
    //     return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    // }

    async patch(lead_management_uuid: string, body: LeadStatusLeadManagementDto) {
        Logger.debug(`[PATCH START] lead_management_uuid=${lead_management_uuid}`);
        Logger.debug(`[REQUEST BODY] ${JSON.stringify(body)}`);

        let in_dnc = "1";
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead status updated successfully by uuid : ${lead_management_uuid} \n`
        }
        console.log("bodybody", body);


        //Add entry in DNC , if code == DNC received in parameter
        if (body.code == "DNC") {
            in_dnc = "0";
            Logger.debug(`[DNC ADD] phone=${body.custom_phone_number}, campaign=${body.campaign_uuid}, tenant=${body.tenant_uuid}`);
            this.addEntryInDNC(body.custom_phone_number, body.campaign_uuid, body.tenant_uuid);
        }

        // -------------------- LEAD UPDATE --------------------
        Logger.debug(`[LEAD UPDATE] Updating lead_management collection`);
        const result = await this.lead_management.updateOne({ lead_management_uuid }, { lead_status: body.lead_status, lead_status_1: body.lead_status_1, lead_status_2: body.lead_status_2, user_uuid: body.user_uuid, $inc: { call_count: 1 }, in_dnc }).exec();

        Logger.debug(`[LEAD UPDATE RESULT] matched=${result.matchedCount}, modified=${result.modifiedCount}`);

        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();

        //Update lead_status in cdrs on last added record
        // let lastCdrsRecordDetail = await this.cdrs.findOne({ lead_uuid: lead_management_uuid }, { uuid: 1 }).sort({ _id: -1 }).exec();
        // let cdrsResponse = await this.cdrs.updateOne({ uuid: lastCdrsRecordDetail.uuid }, { hangup_cause: body.lead_status }).exec();
        // if (cdrsResponse.matchedCount == 0 && cdrsResponse.modifiedCount == 0) {
        //     Logger.error(`Unable to update lead_status in cdrs collection on uuid : ${lastCdrsRecordDetail.uuid}`);
        // } else {
        //     Logger.debug(`Lead status updated successfully in cdrs`);
        // }
        let query: any = {
            lead_uuid: lead_management_uuid,
            tenant_uuid: body.tenant_uuid
        };

        // Only include custom_callid if it's not empty
        if (body.custom_callid && body.custom_callid !== "") {
            query.custom_callid = body.custom_callid;
        }

        let cdrsResponse: any = await this.cdrs.findOneAndUpdate(
            query,
            [{
                $set: {
                    hangup_cause: body.lead_status,
                    user_uuid: {
                        $cond: {
                            if: { $or: [{ $eq: ["$user_uuid", ""] }, { $eq: ["$user_uuid", null] }, { $not: ["$user_uuid"] }] },
                            then: body.user_uuid,
                            else: "$user_uuid"
                        }
                    }
                }
            }],
            { sort: { _id: -1 }, new: true }
        );
        if (!cdrsResponse) {
            // if (cdrsResponse.matchedCount == 0 && cdrsResponse.modifiedCount == 0) {
            // Logger.error(`Unable to update lead_status in cdrs collection on uuid : ${lastCdrsRecordDetail.uuid}`);
            Logger.error(`No CDR found for lead_uuid: ${lead_management_uuid}`);
        } else {
            Logger.debug(`Lead status updated successfully in cdrs`);
        }

        //Remove lead from collection
        // -------------------- CAMPAIGN DATA --------------------
        Logger.debug(`[CAMPAIGN FETCH] flag=${body.campaign_flag}`);
        //let CampaignData: any = await this.outbound_campaign.findOne( { uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1 } ).exec();
        let CampaignData: any;
        if (body.campaign_flag == "blended") {
            CampaignData = await this.blended_campaign.findOne({ uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1, dial_method: 1, leads_in_queue_count: 1 }).exec();
        } else if (body.campaign_flag == "outbound") {
            CampaignData = await this.outbound_campaign.findOne({ uuid: body.campaign_uuid }, { _id: 0, max_retries_disposition: 1, dial_method: 1, leads_in_queue_count: 1 }).exec();
        }

        Logger.debug(`[CAMPAIGN DATA] ${JSON.stringify(CampaignData)}`);

        let callRetriesDisposition = CampaignData?.max_retries_disposition;
        let leads_in_queue_count = CampaignData?.leads_in_queue_count - 1;
        let dial_method = CampaignData?.dial_method;

        // -------------------- QUEUE DELETE --------------------
        Logger.debug(`[RETRY CHECK] lead_status=${body.lead_status}, retry_disposition=${JSON.stringify(callRetriesDisposition)}`);

        if (!callRetriesDisposition.includes(body.lead_status)) {
            Logger.debug(`[QUEUE DELETE] Deleting lead from queue`);
            let deleteLead = await this.leads_in_queue.deleteOne({ campaign_uuid: body.campaign_uuid, lead_management_uuid }).exec();

            Logger.debug(`[QUEUE DELETE RESULT] deleted=${deleteLead.deletedCount}`);

            if (deleteLead.deletedCount == 0) {
                Logger.error(`Unable to delete combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`, deleteMethod);
            } else {
                if (body.campaign_flag == "blended") {
                    if (dial_method == '0' || dial_method == '2') {
                        Logger.debug(`[CAMPAIGN UPDATE] blended leads_in_queue_count=${leads_in_queue_count}`);
                        let updatecampaign = await this.blended_campaign.updateOne({ uuid: body.campaign_uuid }, { leads_in_queue_count: leads_in_queue_count });
                    }
                } else if (body.campaign_flag == "outbound") {
                    if (dial_method == '0' || dial_method == '2') {
                        Logger.debug(`[CAMPAIGN UPDATE] outbound leads_in_queue_count=${leads_in_queue_count}`);
                        let updatecampaign = await this.outbound_campaign.updateOne({ uuid: body.campaign_uuid }, { leads_in_queue_count: leads_in_queue_count });
                    }
                }
                Logger.debug(`One record deleted from queue with combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`);
            }
        } else {
            Logger.debug(`Lead disposition found in call retries disposition in campaign : ${body.campaign_uuid} , so not deleting current lead`);
            // Reset lead_sent so lead can be served again after resend_lead_time
            // AND clear assigned_agent_uuid history so it's fresh for whoever takes it next
            // await this.leads_in_queue.updateOne({ campaign_uuid: body.campaign_uuid, lead_management_uuid }, { lead_sent: "1", assigned_agent_uuid: "" }).exec();
        }

        /*let response = await this.leads_in_queue.deleteOne({ lead_management_uuid, campaign_uuid: body.campaign_uuid }).exec();
        if (response.deletedCount == 0) {
            Logger.error(`Unable to delete combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`, deleteMethod);
    } else {
             Logger.debug(`One record deleted from queue with combination of lead : ${lead_management_uuid} and campaign : ${body.campaign_uuid}`);
    }*/

        //Update agent status to 0
        try {
            let flag = body.pause == "true" ? "2" : "0";
            let updateBody = { flag };
            if (flag == "2") updateBody["call_count"] = 0;

            Logger.debug(`[AGENT UPDATE] agent=${body.user_uuid}, campaign=${body.campaign_uuid}, payload=${JSON.stringify(updateBody)}`);

            let result = await this.auto_campaign_originate.updateOne({ agent_uuid: body.user_uuid, campaign_uuid: body.campaign_uuid }, updateBody).exec();

            Logger.debug(`[AGENT UPDATE RESULT] modified=${result.modifiedCount}`);

            if (result.modifiedCount > 0) {
                Logger.debug(`Agent status set to 0`);
            } else {
                Logger.debug(`Unable to set agent status`);
            }
        } catch (error) {
            Logger.error(`Unable to set agent status`, error.message);
        }

        // -------------------- REPORT ENTRY --------------------
        Logger.debug(`[LEAD REPORT UPDATE] lead_management_uuid=${lead_management_uuid}`);
        this.addUpdateEntryInLeadReport(lead_management_uuid);

        Logger.debug(`[PATCH END] lead_management_uuid=${lead_management_uuid}`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    }

    /*
    @Usage              : To get top 10 cdrs
    @Param queryParams  : Contains logged in user details
    @return Object      : Success / Error
    */

    async getTop10Cdrs(queryParams) {

        let checkRole: any = {};
        let todayDate = this.commonFn.getTodayDate();

        //Check Role type
        let { role, uuid } = queryParams;
        if (role == "agent") {
            checkRole = { user_uuid: uuid };
        }

        let result = await this.cdrs.find({ $and: [{ callstart: { $regex: todayDate, $options: "i" } }, checkRole] }, { tenant_uuid: 0, trunk_uuid: 0, _id: 0 }).sort({ callstart: -1 }).limit(10).exec();
        return this.commonDbFn.sendResponseWithMessage(result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, result);

    }

    /*
    @Usage                         : To update lead status in lead management collection
    @Param lead_management_uuid    : uuid of lead
    @Param body                    : Contains update body
    @return Object                 : Success / Error
    */

    async skipLead(lead_management_uuid: string, body: LeadSkipDto) {
        const { uuid, campaign_uuid, tenant_uuid } = body;
        //Update lead status from collection and release lock
        //We use $pull to REMOVE the agent from this lead entirely so it's free for others and not "owned" by this agent anymore
        let response = await this.leads_in_queue.updateOne({ lead_management_uuid, campaign_uuid, tenant_uuid }, { $set: { assigned_agent_uuid: "", lead_sent: "1" }, $addToSet: { agent_uuid: uuid } }).exec();
        if (response.matchedCount == 0) {
            Logger.error(`Lead not found ${lead_management_uuid}`, patchMethod);
        } else {
            Logger.debug(`Lead updated with campaign : ${campaign_uuid} & lead_management_uuid : ${lead_management_uuid}`);
        }

        // Get tenant company code
        let tenantData: any = await this.tenant.findOne({ uuid: tenant_uuid }, { company_code: 1 }).lean();

        // Delete lead from both collections for specific tenant
        if (tenantData?.company_code === "vyapar") {
            // Fetch lead management details to get custom_fields
            const leadDataDoc: any = await this.lead_management.findOne(
                { lead_management_uuid, campaign_uuid, tenant_uuid },
                { custom_fields: 1 }
            ).lean();

            const customFields = leadDataDoc?.custom_fields || {};
            // Trigger leadSkip webhook
            const webhookPayload = {
                // "Incoming Webhook Payload": [
                //     {
                agent_uuid: uuid,
                lead_uuid: lead_management_uuid,
                status: "Lead Skip By Agent",
                custom_fields: customFields
                //     }
                // ]
            };
            await this.webhookService.triggerWebhook(tenant_uuid, "leadSkip", webhookPayload);

            await Promise.all([
                this.leads_in_queue.deleteOne({ lead_management_uuid, campaign_uuid, tenant_uuid }).exec(),
                this.lead_management.deleteOne({ lead_management_uuid, campaign_uuid, tenant_uuid }).exec()
            ]);
            Logger.debug(`Lead deleted from leads_in_queue and lead_management for tenant : ${tenant_uuid}`);
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Lead skipped successfully");
    }

    /********************** For Auto Campaign Mode *****************************/

    /*
    @Usage                         : To check agent exist in auto campaign originate , if not then new agent will added into the collection
    @Param resumePauseDto          : Request dto
    @return Object                 : Success / Error
    */

    /*async checkAgentExistInCollection(resumeDto: ResumeDto) {
        let flag: any = "0";
    let { campaign_uuid, uuid , tenant_uuid , username , campaign_mode } = resumeDto;
        let getAgentDetails = await this.auto_campaign_originate.findOne({ agent_uuid: uuid, campaign_uuid }).exec();

        if (getAgentDetails == null) {
            resumeDto.agent_uuid = uuid;
            const result = new this.auto_campaign_originate(resumeDto);
            await result.save();
            Logger.debug("Agent added in auto campaign");
        } else {
            Logger.debug("Agent was already exist in auto campaign");

        try {
                let result = await this.auto_campaign_originate.updateOne({ agent_uuid: uuid, campaign_uuid , tenant_uuid }, { flag: "0" }).exec();
                if (result.modifiedCount > 0) {
                    Logger.debug(`Agent status set to 0`);
            getAgentDetails.flag = "0";
                } else {
                    Logger.debug(`Unable to set agent status`);
                }
            } catch (error) {
                Logger.error(`Unable to set agent status`, error.message);
            }
        }

    if (getAgentDetails != null) {
            flag = getAgentDetails.flag;
        }
    else{
        flag = "0";
    }
        //Check flag [0 - Available , 1 - Busy , 2 - Break]
        if (flag == "0") {

            //Check leads exist in lead_originate collection[flag in lead_originate 0 - , 1 - Busy, 2 - Available for call]
            let response = await this.lead_originate.findOne({ campaign_uuid,flag:"0" }).exec();

        //If no data found then we will originate new calls based on given concurrent_calls value in outbound campaign
            if (response == null) {

                //Originate new calls from leads_in_queue collection
                let populateFileds = [{ path : "outgoing_rule" , select : "rules -_id" }];
        let campaignData: any = await this.outbound_campaign.findOne({ uuid: campaign_uuid }, { concurrent_call: 1, call_id_type :1 , call_id_value : 1, outgoing_rule_uuid : 1 , agent_timeout : 1 , number_masking : 1 , timeout : 1 , answering_machine_detection : 1 , caller_id_time: 1 ,  _id: 0 }).populate(populateFileds).exec(); //Imp point from frontend cc values should be pass so we do less query
        let populateFields = [{ path: "lead_details", select: "first_name last_name phone_number lead_management_uuid uuid phone_code custom_phone_number -_id" }];
                let allLeads : any  = await this.leads_in_queue.find({ campaign_uuid,tenant_uuid,lead_sent:"1" },{campaign_uuid :1 , lead_management_uuid : 1 , tenant_uuid :1 , _id : 0}).limit(campaignData?.concurrent_call).populate(populateFields).exec();
        if (!allLeads || allLeads.length === 0) {
            Logger.debug(`Leads not found with campaign : ${campaign_uuid} and lead_sent = 1`,allLeads);
            return;
        }

        //Get caller IDs [For type random,manual]
        let caller_id;
                if(campaignData?.call_id_type != null && campaignData?.call_id_type != "3"  ){
                   if (this.storedCallerIDs.length == 0) {
                        await this.commonCodeToGetCallerID(campaignData);
                    }
                    caller_id = this.storedCallerIDs[0];

                    if (new Date() > this.storedDates[0].end_date) {
                        Logger.warn(`Caller ID time ==> ${campaignData?.caller_id_time} minutes has been passed , sending new caller id`);
                        this.storedCallerIDs = [];
                        this.storedDates = [];
                        await this.commonCodeToGetCallerID(campaignData);
                        caller_id = this.storedCallerIDs[0];
                    }
        }
        let i,leadNumber, leadDetails: any = {},counter=0;

        for (i = 0; i < allLeads.length; i++)
        {
            //Append phone code if phone code not blank
                    if (allLeads[i]?.lead_details[0]?.phone_code != "" && allLeads[i]?.lead_details[0]?.phone_code != undefined) {
                console.log("LEAD",allLeads[i]?.lead_details[0]?.phone_code,allLeads[i]?.lead_details[0].phone_number);
                        leadNumber = allLeads[i]?.lead_details[0].phone_code.concat(allLeads[i]?.lead_details[0].phone_number);
                    } else {
                        leadNumber = allLeads[i]?.lead_details[0].phone_number;
                    }
            leadNumber = allLeads[i]?.lead_details[0].custom_phone_number;
            if(campaignData?.call_id_type != null && campaignData?.call_id_type == "3"){
                      if (this.storedCallerIDs.length == 0) {
                            await this.commonCodeToGetCallerID(campaignData);
                        }
                        caller_id = this.storedCallerIDs[0];

                        if (new Date() > this.storedDates[0].end_date) {
                            Logger.warn(`Caller ID time ==> ${campaignData?.caller_id_time} minutes has been passed , sending new caller id`);
                            this.storedCallerIDs = [];
                            this.storedDates = [];
                            await this.commonCodeToGetCallerID(campaignData);
                            caller_id = this.storedCallerIDs[0];
                        }
            }

            //Get Trunk name
                    let trunkDetails: any = await this.getTrunkUUID(campaignData.outgoing_rule[0].rules,leadNumber);
                    Logger.debug(`Trunk Details`,JSON.stringify(trunkDetails));

            //Get Lead details
                    leadDetails = {
                        first_name: allLeads[i]?.lead_details[0]?.first_name,
                        last_name: allLeads[i]?.lead_details[0]?.last_name,
                        phone_number: trunkDetails.lead_number,
            lead_management_uuid : allLeads[i]?.lead_details[0]?.lead_management_uuid
                    }
                    /if (trunkDetails.lead_number != leadNumber) {
                        leadDetails.phone_number = trunkDetails.lead_number;
                    }/

            let trunkName = await this.trunk.findOne({uuid : trunkDetails.trunk_uuid},{name : 1 , _id : 0}).exec();

            //update lead status to sent
                    let leadData = await this.leads_in_queue.updateOne({ lead_management_uuid: allLeads[i]?.lead_details[0]?.lead_management_uuid, campaign_uuid: getAgentDetails?.campaign_uuid, tenant_uuid }, { lead_sent: "0" }).exec();
                    if (leadData.matchedCount == 0 && leadData.modifiedCount == 0) {
                        Logger.error(`Unable to update data on where condition`);
                    } else {
                        Logger.debug(`Successfully updated lead_sent status`);
                    }


           //Delete lead from queue
           let deleteLead = await this.leads_in_queue.deleteOne({ campaign_uuid: getAgentDetails?.campaign_uuid, lead_management_uuid : allLeads[i]?.lead_details[0]?.lead_management_uuid , tenant_uuid }).exec();
                   if (deleteLead.deletedCount == 0) {
                    Logger.error(`Unable to delete combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`, deleteMethod);
                   } else {
                             Logger.debug(`One record deleted from queue with combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`);
                   }/

           //Check required params is missing then not generate any calls and  update lead status to
                  try{
            if (campaign_uuid == undefined || tenant_uuid == undefined || leadDetails.phone_number == undefined || caller_id == undefined || trunkName == null) {
                        Logger.error(`Found something undefined`, JSON.stringify({ campaign_uuid, tenant_uuid, agent_uuid : uuid, phone_number: leadDetails.phone_number, caller_id, trunk: trunkName }));
                        let getNotAvailableDisposition = await this.disposition.findOne({ code: "NAVL" }, { disposition_uuid: 1, _id: 0 }).exec();
                        let dispositionUUID = getNotAvailableDisposition?.disposition_uuid;
                        let leadManagementUpdate = await this.lead_management.updateOne({ lead_management_uuid: allLeads[i]?.lead_management_uuid }, { lead_status: dispositionUUID }).exec();
                        if (leadManagementUpdate.modifiedCount > 0) {
                            Logger.debug(`Lead status updated to not available disposition`);
                        } else {
                            Logger.error(`Unable to update lead status to not available disposition`);
                        }

            //add failed call
            let insertData = {campaign_uuid : campaign_uuid , flag : "2"};
            const predictiveResult = new this.predictive_calculation(insertData);
                        await predictiveResult.save();
            Logger.debug(JSON.stringify(predictiveResult));

            //update drop call
                        let campaignStatisticsResponse = await this.campaign_statistics.updateOne( { campaign_uuid }, { $inc: { drop: 1 } , success : 0 , fail : 0 } , { upsert : true }).exec();
                        if (campaignStatisticsResponse.modifiedCount > 0) {
                                Logger.debug(`Successfully updated drop calls in campaign_statistics`);
                        } else {
                                Logger.debug(`Added new entry of drop in campaign_statistics`);
                        }

            //Delete lead from queue
            let deleteLead = await this.leads_in_queue.deleteOne({ campaign_uuid: getAgentDetails?.campaign_uuid, lead_management_uuid : allLeads[i]?.lead_management_uuid , tenant_uuid }).exec();
            if (deleteLead.deletedCount == 0) {
                Logger.error(`Unable to delete combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`, deleteMethod);
            } else {
                Logger.debug(`One record deleted from queue with combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`);
            }

                        continue;
                    }
          }catch(error){
                Logger.error(`Found undefined in call string`,error.message);
            continue;
          }
                    Logger.debug("Originating calls");

            //update success count
                    counter++;

                    let generateUUIDForCalling : any = await this.commonFn.getUUIDForCall(campaign_uuid , tenant_uuid,uuid , leadDetails ,caller_id,trunkName?.name,campaignData?.timeout,username,campaignData?.number_masking,campaign_mode,campaignData?.answering_machine_detection);

            //Update lead status in lead management to auto_originate
                    let getAutoOriginateDisposition = await this.disposition.findOne({code : "Auto_Originate"},{disposition_uuid : 1 , _id : 0}).exec();
                    let dispositionUUID = getAutoOriginateDisposition?.disposition_uuid;
                    let leadManagementUpdate = await this.lead_management.updateOne({lead_management_uuid : allLeads[i]?.lead_management_uuid},{lead_status : dispositionUUID},{$upsert : true}).exec();
                    if(leadManagementUpdate.modifiedCount > 0){
                        Logger.debug(`Lead status updated to auto originate disposition`);
                    }else{
                        Logger.error(`Unable to update lead status to auto originate disposition`);
                    }

            //Delete lead from queue
                   let deleteLead = await this.leads_in_queue.deleteOne({ campaign_uuid: getAgentDetails?.campaign_uuid, lead_management_uuid : allLeads[i]?.lead_management_uuid , tenant_uuid }).exec();
                   if (deleteLead.deletedCount == 0) {
                        Logger.error(`Unable to delete combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`, deleteMethod);
                   } else {
                       Logger.debug(`One record deleted from queue with combination of lead : ${allLeads[i]?.lead_details[0]?.lead_management_uuid} and campaign : ${getAgentDetails?.campaign_uuid}`);
                   }

                   if(generateUUIDForCalling?.body){
                let callUUID = generateUUIDForCalling?.body.split(":")[1];
            if(allLeads[i] != "" && allLeads[i] != undefined){
              allLeads[i]["bridge_uuid"] = callUUID.replace("\n", "").trim();
            }
                }
            }
        let result = await this.outbound_customer_ringing.updateOne({ tenant_uuid }, { $inc: { count: counter } }, { upsert: true });
            Logger.warn(`Incremented Counter value by ${counter}...`, JSON.stringify(result));

        await this.lead_originate.insertMany(allLeads , {ordered : false});
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Leads added or sent");
      }
    }*/

    /*
    @Usage           : To wait for defined seconds before sending next call
    @Param  ms       : in seconds how many seconds want to wait
    @Param  Promise
    */

    sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    async checkAgentExistInCollection(resumeDto: ResumeDto) {
        let { campaign_uuid, uuid, tenant_uuid, username, campaign_mode, concurrent_calls, role, manager_uuid, domain, campaign_flag } = resumeDto;
        //Variable declaration
        let allLeads, campaignData, caller_id, i, leadNumber, leadDetails: any = {}, errorInLeads = [], successLeads = [], notAvailableDisposition, autoOriginateDisposition, delayValue;

        //Use manager uuid when agent of manager found
        tenant_uuid = manager_uuid == undefined ? tenant_uuid : manager_uuid;

        let tenant_details = await this.tenant.findOne({ tenant_uuid }).select("account_code").exec();
        console.log("accountcode");
        console.log(tenant_details);
        let account_code;
        if (tenant_details != null) {
            account_code = tenant_details.account_code;
        }
        console.log('accountcode ============>', account_code);

        // Add/Update agent status ==> flag [0 - Available , 1 - Busy , 2 - Break]
        let agentStatus = await this.getAgentStatus(campaign_uuid, uuid, tenant_uuid, resumeDto);

        let agentcount = await this.agent_live_report.count({ tenant_uuid: tenant_uuid, campaign_uuid: campaign_uuid, status: { $ne: '6' }, agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }).exec();
        console.log('agent_count =====>', agentcount);

        //Check leads exist in lead_originate collection[flag in lead_originate 0 - , 1 - Busy, 2 - Available for call]
        //let response = await this.lead_originate.findOne({ campaign_uuid, flag: "0" }).exec();
        //let response = await this.lead_originate.find({ campaign_uuid, flag: "0" }).count().exec();

        const liveCallsForTenant: any = await this.getLiveCallsForTenant("", resumeDto);

        // let response = await this.lead_originate.find( { campaign_uuid, flag: "0" } ).sort( { _id: -1 } ).exec();
        let leadcount = await this.lead_originate.count({ campaign_uuid, flag: "0" }).sort({ _id: -1 }).exec();
        console.log(leadcount);
        console.log("leadcount=========");

        let leadcheckdate = await this.lead_originate.findOne({ campaign_uuid, flag: "0" }).sort({ _id: -1 }).select('checkdate').exec();
        console.log(leadcheckdate);
        console.log("leadcheckdate=========");
        //If no data found then we will originate new calls based on given concurrent_calls value in outbound campaign

        const currentDate = new Date(); // Get the current date and time
        currentDate.setMinutes(currentDate.getMinutes() + 2); // Add 2 minutes to the current date and time
        // let checkdate = currentDate.toISOString();

        let checkdate_flag = 0;
        if (leadcheckdate == null) {
            checkdate_flag = 1;
        } else {
            if (currentDate.toISOString() > leadcheckdate.checkdate) {
                checkdate_flag = 2;
            }
        }

        Logger.verbose("DATA", agentStatus, leadcount, currentDate.toISOString(), parseInt(concurrent_calls), parseInt(liveCallsForTenant));

        //Check Role
        let loggedInEntityUUID = manager_uuid;
        console.log("MANAGER_UUID", manager_uuid);

        //Use manager uuid when agent of manager found
        //tenant_uuid = manager_uuid == undefined ? tenant_uuid : manager_uuid;

        //if (  agentStatus > response.length  || ( currentDate.toISOString() > response[ 0 ]?.checkdate ) ) {
        if (((agentStatus > leadcount) || (checkdate_flag == 1 || checkdate_flag == 2)) && (parseInt(concurrent_calls) > parseInt(liveCallsForTenant) || (concurrent_calls == "0"))) {
            await this.commonFn.addtempUpdateAgentInQueue(username, domain);
            try {
                let populateFileds = [{ path: "outgoing_rule", select: "rules -_id" }];
                if (campaign_flag == 'blended') {
                    campaignData = await this.blended_campaign.findOne({ uuid: campaign_uuid }, { concurrent_call: 1, call_id_type: 1, call_id_value: 1, outgoing_rule_uuid: 1, agent_timeout: 1, number_masking: 1, timeout: 1, answering_machine_detection: 1, caller_id_time: 1, cps: 1, _id: 0 }).populate(populateFileds).exec();
                } else if (campaign_flag == 'outbound') {
                    campaignData = await this.outbound_campaign.findOne({ uuid: campaign_uuid }, { concurrent_call: 1, call_id_type: 1, call_id_value: 1, outgoing_rule_uuid: 1, agent_timeout: 1, number_masking: 1, timeout: 1, answering_machine_detection: 1, caller_id_time: 1, cps: 1, _id: 0 }).populate(populateFileds).exec();
                }
                allLeads = await this.fetchLeads(campaign_uuid, tenant_uuid, campaignData?.concurrent_call, agentcount);
                if (allLeads.length == 0) {
                    Logger.error(`Leads not found with campaign : ${campaign_uuid} and lead_sent = 1 \n`);
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `No more leads found with campaign : ${campaign_uuid}`);
                }

                //Get disposition uuid of Not Available
                let matched = this.dispositionDetails.filter(function (el) {
                    return el.NAVL;
                });
                if (matched.length == 0) {
                    let getNotAvailableDisposition = await this.disposition.findOne({ code: "NAVL" }, { disposition_uuid: 1, _id: 0 }).exec();
                    notAvailableDisposition = getNotAvailableDisposition?.disposition_uuid;
                    this.dispositionDetails.push({ NAVL: notAvailableDisposition });
                } else {
                    notAvailableDisposition = matched[0].NAVL;
                }

                //Get disposition uuid of Auto originate
                matched = this.dispositionDetails.filter(function (el) {
                    return el.Auto_Originate;
                });
                if (matched.length == 0) {
                    let getAutoOriginateDisposition = await this.disposition.findOne({ code: "Auto_Originate" }, { disposition_uuid: 1, _id: 0 }).exec();
                    autoOriginateDisposition = getAutoOriginateDisposition?.disposition_uuid;
                    this.dispositionDetails.push({ Auto_Originate: autoOriginateDisposition });
                } else {
                    autoOriginateDisposition = matched[0].Auto_Originate;
                }

            } catch (error) {
                Logger.error(`Error in catch block ==> lead_originate \n`, error.message);
            }


            //Get caller IDs [For type random,manual]
            try {
                if (campaignData?.call_id_type == "0" && campaignData?.call_id_value) {
                    caller_id = campaignData?.call_id_value;
                } else if (campaignData?.call_id_type != null && (campaignData?.call_id_type != "3" && campaignData?.call_id_type != "4") && (campaignData?.call_id_value == "" || campaignData?.call_id_value == null)) {
                    caller_id = await this.commonCodeToGetCallerID(campaignData);
                }
            } catch (error) {
                Logger.error(`Error in catch block ==> Caller ID \n`, error.message);
            }

            for (i = 0; i < allLeads.length; i++) {

                //Update lead status to sent
                //let leadData = await this.leads_in_queue.updateOne( { lead_management_uuid: allLeads[ i ]?.lead_details[ 0 ]?.lead_management_uuid, campaign_uuid, tenant_uuid }, { lead_sent: "0" } ).exec();
                //if ( leadData.matchedCount == 0 && leadData.modifiedCount == 0 ) {
                //    Logger.error( `Unable to update data on where condition \n` );
                //} else {
                //    Logger.debug( `Successfully updated lead_sent status \n` );
                //}

                leadNumber = allLeads[i]?.lead_details[0]?.phone_number;
                if (campaignData?.call_id_type != null && (campaignData?.call_id_type == "3" || campaignData?.call_id_type == "4")) {
                    caller_id = await this.commonCodeToGetCallerID(campaignData, leadNumber);
                }

                //Get Trunk name
                let trunkDetails: any = await this.getTrunkUUID(campaignData.outgoing_rule[0].rules, leadNumber);
                Logger.debug(`Trunk Details`, JSON.stringify(trunkDetails));

                //Get Lead details
                leadDetails = {
                    first_name: allLeads[i]?.lead_details[0]?.first_name,
                    last_name: allLeads[i]?.lead_details[0]?.last_name,
                    phone_number: trunkDetails.lead_number,
                    lead_management_uuid: allLeads[i]?.lead_details[0]?.lead_management_uuid,
                    original_number: leadNumber
                }

                //Need to change below query as voice broadcast
                let trunkName = await this.trunk.findOne({ uuid: trunkDetails.trunk_uuid }, { name: 1, _id: 0 }).exec();

                //Check required params is missing then not generate any calls and  update lead status to
                try {
                    if (campaign_uuid == undefined || tenant_uuid == undefined || leadDetails.phone_number == undefined || caller_id == undefined || trunkName == null) {
                        Logger.error(`Found something undefined`, JSON.stringify({ campaign_uuid, tenant_uuid, agent_uuid: uuid, phone_number: leadDetails.phone_number, caller_id, trunk: trunkName }));

                        //push all error leads
                        errorInLeads.push(allLeads[i]?.lead_management_uuid);
                        delete allLeads[i];
                        delayValue = (campaignData.cps == undefined) ? 1 * 1000 : campaignData.cps * 1000;
                        await this.sleep(delayValue);
                        continue;
                    }
                } catch (error) {
                    Logger.error(`Found undefined in call string`, error.message);
                    continue;
                }

                Logger.verbose(JSON.stringify(leadDetails), "Started originating call to ==> ");

                let generateUUIDForCalling: any = await this.commonFn.getUUIDForCall(campaign_uuid, tenant_uuid, uuid, leadDetails, caller_id, trunkName?.name, campaignData?.timeout, username, campaignData?.number_masking, campaign_mode, campaignData?.answering_machine_detection, "", loggedInEntityUUID, domain, account_code, campaign_flag, "");

                //Update lead status in lead management to auto_originate
                let leadManagementUpdate = await this.lead_management.updateOne({ lead_management_uuid: allLeads[i]?.lead_management_uuid }, { lead_status: autoOriginateDisposition }, { upsert: true }).exec();
                if (leadManagementUpdate.modifiedCount > 0) {
                    Logger.debug(`Lead status updated to auto originate disposition \n`);
                } else {
                    Logger.error(`Unable to update lead status to auto originate disposition \n`);
                }

                //push success lead
                successLeads.push(allLeads[i]?.lead_management_uuid);

                /*if ( generateUUIDForCalling?.body ) {
                    let callUUID = generateUUIDForCalling?.body.split( ":" )[ 1 ];
                    if ( allLeads[ i ] != "" && allLeads[ i ] != undefined ) {
                        allLeads[ i ][ "bridge_uuid" ] = callUUID.replace( "\n", "" ).trim();
                        allLeads[ i ][ "checkdate" ] = checkdate;
                    }
                }*/

                if (generateUUIDForCalling && generateUUIDForCalling.body) {
                    let callUUID = generateUUIDForCalling.body.split(":")[1];
                    if (callUUID && allLeads[i] !== undefined && allLeads[i] !== "") {
                        // Ensure callUUID.replace("\n", "") is not undefined before calling trim()
                        let bridgeUUID = callUUID.replace("\n", "");
                        if (bridgeUUID) {
                            allLeads[i]["bridge_uuid"] = bridgeUUID.trim();
                            // allLeads[ i ][ "checkdate" ] = checkdate;
                        }
                    }
                }
                let checkdate = currentDate.toISOString();
                // console.log( checkdate_new );
                // console.log( "checkdate_new" );
                allLeads[i]["checkdate"] = checkdate;
                await this.lead_originate.insertMany(allLeads[i], { ordered: false });
                delayValue = (campaignData.cps == undefined) ? 1 * 1000 : campaignData.cps * 1000;
                await this.sleep(delayValue);
            }

            //  let result = await this.outbound_customer_ringing.updateOne( { tenant_uuid }, { $inc: { count: successLeads.length } }, { upsert: true } );
            // Logger.warn( `Incremented Counter value by ${successLeads.length}... \n`, JSON.stringify( result ) );


            //Update or delete data from collection based on success/error leads array
            let obj, predectiveArray = [];
            if (errorInLeads.length > 0) {
                try {
                    //Add failed call
                    errorInLeads.map((data) => {
                        obj = { campaign_uuid, tenant_uuid, agent_uuid: uuid, flag: "2" }
                        predectiveArray.push(obj);
                    });
                    await this.predictive_calculation.insertMany(predectiveArray);
                    Logger.debug(JSON.stringify(predectiveArray));

                    //Update drop call
                    let campaignStatisticsResponse = await this.campaign_statistics.updateOne({ campaign_uuid }, { $inc: { fail: errorInLeads.length } }, { upsert: true }).exec();
                    if (campaignStatisticsResponse.modifiedCount > 0) {
                        Logger.debug(`Successfully updated drop calls in campaign_statistics`, JSON.stringify(campaignStatisticsResponse));
                    } else {
                        Logger.debug(`Added new entry of drop in campaign_statistics`);
                    }

                    //Update all failed leads with not available disposition
                    let leadManagementUpdate = await this.lead_management.updateMany({ lead_management_uuid: { $in: errorInLeads } }, { lead_status: notAvailableDisposition }).exec();
                    if (leadManagementUpdate.modifiedCount > 0) {
                        Logger.debug(`Lead status updated to not available disposition \n`, JSON.stringify(leadManagementUpdate));
                    } else {
                        Logger.error(`Unable to update lead status to not available disposition \n`);
                    }

                    //Update lead data into lead_report
                    errorInLeads.map((data) => { this.addUpdateEntryInLeadReport(data); });

                    //Remove leads from lead originate
                    let result = await this.lead_originate.deleteMany({ lead_management_uuid: { $in: errorInLeads }, campaign_uuid }).exec();
                    if (result.deletedCount > 0) {
                        Logger.debug(`Leads delete from lead_originate`)
                    } else {
                        Logger.error(`Condition not matched , so not able to delete lead from queue`);
                    }

                } catch (error) {
                    Logger.error(`Error in catch block ==> errorInLeads`, error.message);
                }

                //Update lead data into lead_report
                // errorInLeads.map( ( data ) => { this.addUpdateEntryInLeadReport( data ); } );
            }

            //Delete lead from queue
            //if (successLeads.length > 0) {
            /* try {
                let allLeadsUUID = [ ...errorInLeads, ...successLeads ];
                // let deleteLead = await this.leads_in_queue.deleteMany( { campaign_uuid, tenant_uuid, lead_management_uuid: { $in: allLeadsUUID } } ).exec();
                // if ( deleteLead.deletedCount == 0 ) {
                //     Logger.error( `Unable to delete lead with campaign_uuid : ${campaign_uuid} & tenant_uuid : ${tenant_uuid}`, deleteMethod );
                // } else {
                //     Logger.debug( `Deleted lead with campaign_uuid : ${campaign_uuid} & tenant_uuid : ${tenant_uuid}` );
                // }
                let lead_length = allLeadsUUID.length;
                console.log( lead_length );
                let deleteLead = await this.leads_in_queue.deleteMany( { campaign_uuid, tenant_uuid, lead_management_uuid: { $in: allLeadsUUID } } ).exec();
                if ( deleteLead.deletedCount == 0 ) {
                    Logger.error( `Unable to delete lead with campaign_uuid : ${campaign_uuid} & tenant_uuid : ${tenant_uuid}`, deleteMethod );
                } else {
                    //  let updatecampaign = await this.outbound_campaign.updateOne( { uuid: campaign_uuid }, { leads_in_queue_count: leads_in_queue_count } );
                    const decrement = '-';
                    // const decrement_value = lead_length;
                    const decrement_value = decrement + lead_length;
                    const final_value = parseInt( decrement_value );

                    if ( campaign_flag == 'blended' ) {
                        let updateCampaign = await this.blended_campaign.updateOne(
                            { uuid: campaign_uuid },
                            { $inc: { leads_in_queue_count: final_value } }
                        );
                    } else if ( campaign_flag == 'outbound' ) {
                        let updateCampaign = await this.outbound_campaign.updateOne(
                            { uuid: campaign_uuid },
                            { $inc: { leads_in_queue_count: final_value } }
                        );
                    }
                    Logger.debug( `Deleted lead with campaign_uuid : ${campaign_uuid} & tenant_uuid : ${tenant_uuid}` );
                }
            } catch ( error ) {
                Logger.error( `Error in catch block ==> successLeads`, error.message );
            } */
            //}

            //await this.lead_originate.insertMany( allLeads, { ordered: false } );
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Leads added or sent");
    }

    /*
    @Usage                         : To update agent status
    @Param resumePauseDto          : Request dto
    @return Object                 : Success / Error
    */

    async updateAgentStatus(pauseDto: PauseDto) {
        const { agent_uuid, campaign_uuid, tenant_uuid } = pauseDto;
        try {
            let todayDateTime = this.commonFn.getTodayDate(true);
            let response = await this.auto_campaign_originate.updateOne({ agent_uuid, campaign_uuid, tenant_uuid }, { flag: "2", call_count: 0 }).exec();
            if (response.modifiedCount == 0) {
                Logger.debug(`Unable to find agent with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Unable to update agent status");
            } else {
                Logger.debug(`Agent status updated with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent status updated successfully");
            }
        } catch (err) {
            Logger.debug("Unable to update agent status", err.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Unable to update agent status");
        }
    }

    /*
    @Usage                 : To update agent status
    @Param campaignData    : Detail of call_id_type & call_id_value
    @return String         : Value of caller id
    */

    async getCallerID(campaignData, lead_number = "") {
        let result;
        const { call_id_type, call_id_value } = campaignData;
        switch (call_id_type) {
            case "0":
                result = call_id_value;
                break;
            case "1":
                result = await this.caller_ids.aggregate([
                    {
                        $match: { caller_id_group_uuid: call_id_value }
                    },
                    {
                        $sample: { size: 1 }
                    },
                    {
                        $project: { caller_id: 1, _id: 0 }
                    }
                ]);
                if (result != null) {
                    result = result[0]?.caller_id;
                }
                break;
            case "2":
                break;
            case "3":
                result = await this.caller_ids.find({ caller_id_group_uuid: call_id_value });

                if (result != null) {
                    let numberLength = lead_number.length;
                    let callerIdsLength = result.length;
                    let obj, i, j, res, finalCallerId = [], leadNumber: any = "0";
                    for (i = 0; i < callerIdsLength; i++) {
                        for (j = 0; j < numberLength; j++) {
                            leadNumber = lead_number.substr(0, j);
                            if (leadNumber == "") {
                                leadNumber = 0;
                            }
                            res = result[i].caller_id.startsWith(leadNumber);
                            if (res) {
                                obj = { count: j, caller_id: result[i].caller_id };
                                finalCallerId.push(obj);
                            }
                            /*else {
                                             break;

                             }*/

                        }
                    }
                    //let finalArray = this.removeDuplicates(finalCallerId);

                    //Remove duplicates
                    const uniqueIds = [];
                    const unique = finalCallerId.filter(element => {
                        const isDuplicateCount = uniqueIds.includes(element.count);
                        const isDuplicateCallerID = uniqueIds.includes(element.caller_id);

                        if (!isDuplicateCount && !isDuplicateCallerID) {
                            uniqueIds.push(element.id);
                            return true;
                        }
                        return false;
                    });
                    let newResult = unique.sort((a, b) => Number(b.count) - Number(a.count));
                    result = newResult[0]?.caller_id;
                } else {
                    result = await this.caller_ids.aggregate([
                        {
                            $match: { caller_id_group_uuid: call_id_value }
                        },
                        {
                            $sample: { size: 1 }
                        },
                        {
                            $project: { caller_id: 1, _id: 0 }
                        }
                    ]);
                    if (result != null) {
                        result = result[0]?.caller_id;
                    }

                }
                break;
            case "4":
                let destination_number = lead_number.slice(0, -4);
                let randomnum = Math.floor(1000 + Math.random() * 9000);
                let random_number = randomnum.toString();
                result = destination_number + random_number;
                break;
        }
        return result;
    }

    /*removeDuplicates(arr){
     const uniqueIds = [];

     arr.filter(element => {
     const isDuplicateCount = uniqueIds.includes(element.count);
     const isDuplicateCallerID = uniqueIds.includes(element.caller_id);
     if (!isDuplicateCount && !isDuplicateCallerID) {
     uniqueIds.push(element.id);
    }
});
return uniqueIds;
    }*/


    async getTrunkUUID(rules, lead_number) {
        let i, length, prefix, prefixLen, leadNumberLength, getLengthBasedOnPrefix, trunkUUID, strip, stripLen, prepend, leadNumberAfterExtract, trunkDetails: any = {};
        let rulesLength = rules?.length;
        if (rules.length != 0 && lead_number != "") {
            for (i = 0; i < rulesLength; i++) {
                length = rules[i]?.length;
                prefix = rules[i]?.prefix;
                prefixLen = prefix?.length;
                leadNumberLength = lead_number?.length;

                getLengthBasedOnPrefix = lead_number?.slice(0, prefixLen);
                if (getLengthBasedOnPrefix == prefix && length == 0) {
                    trunkUUID = rules[i];
                    break;
                } else if (getLengthBasedOnPrefix == prefix && length != 0) {
                    if (leadNumberLength?.toString() == length?.toString()) {
                        trunkUUID = rules[i];
                        break;
                    }
                } else if (prefix == "*" && length == 0) {
                    trunkUUID = rules[i];
                    break;
                } else { // comes in else when prefix = * and length != 0
                    if (leadNumberLength?.toString() == length?.toString()) {
                        trunkUUID = rules[i];
                        break;
                    }
                }
            }

            trunkDetails.trunk_uuid = trunkUUID;
            trunkDetails.lead_number = lead_number;

            //Check for strip & prepend
            strip = trunkDetails?.trunk_uuid?.strip;
            prepend = trunkDetails?.trunk_uuid?.prepend;
            if (strip != "" && strip != undefined) {
                stripLen = strip.length;
                leadNumberAfterExtract = lead_number.slice(0, stripLen);
                if (leadNumberAfterExtract == strip) {
                    lead_number = lead_number.slice(stripLen);
                }
            }
            if (prepend != "" && strip != undefined) {
                lead_number = prepend.concat(lead_number);
            }
            return { lead_number, trunk_uuid: trunkDetails?.trunk_uuid?.trunk_uuid }
        }
    }

    /*
     @Usage                 : To update agent status
     @Param pauseDto        : Request dto
     @return Object         : Success / Error
     */


    async updateAgentStatusForNewCall(pauseDto: AgentStatusForNewCall) {
        const { agent_uuid, campaign_uuid, tenant_uuid, agent_status } = pauseDto;
        let response;
        try {
            let flag = agent_status == "" ? "0" : "2";
            let updateBody = { flag };
            if (flag == "2") updateBody["call_count"] = 0;
            response = await this.auto_campaign_originate.updateOne({ agent_uuid, campaign_uuid, tenant_uuid }, updateBody).exec();
            if (response.modifiedCount == 0) {
                Logger.error(`Unable to find agent with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to find agent with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
            } else {
                Logger.debug(`Agent status updated with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent status updated successfully");
            }
        } catch (err) {
            Logger.error("Unable to update agent status", err.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to find agent with uuid : ${agent_uuid} and campaign ${campaign_uuid}`);
        }
    }


    /********************** Agent login logout Report *****************************/

    /*
    @Usage                 : To add agent entry
    @Param campaignData    : Detail of call_id_type & call_id_value
    @return String         : Value of caller id
    */

    // async addAgentEntry ( agentLoginLogoutReportDto: AgentLoginLogoutReportDto ) {
    //     try {
    //         const { uuid, login_status } = agentLoginLogoutReportDto;
    //         let getPreviousEntryOfAgent = await this.agent_login_logout_report.findOne( { agent_uuid: uuid } ).sort( { _id: -1 } ).exec();

    //         let currentDateTime = new Date();
    //         agentLoginLogoutReportDto.agent_uuid = uuid;
    //         agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
    //         let utCDate = new Date().toISOString();
    //         agentLoginLogoutReportDto.date_time = utCDate;

    //         if ( getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "1" && login_status == "2" ) {
    //             let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getMinutes() - 1 ) );

    //             //Add login entry first
    //             let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "0";
    //             agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

    //             //Add logout entry
    //             logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "2";
    //             delete agentLoginLogoutReportDto.createdAt;

    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

    //             return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Agent entry added successfully" );
    //         } else {
    //             agentLoginLogoutReportDto.login_status = login_status;
    //             delete agentLoginLogoutReportDto.createdAt;

    //             let logMessages = { logSuccessMsg: `Agent entry added successfully` };
    //             return this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );
    //         }

    //     } catch ( error ) {
    //         Logger.error( "Error in adding agent entry in report", error.message );
    //     }
    // }

    // async addAgentEntry ( agentLoginLogoutReportDto: AgentLoginLogoutReportDto ) {
    //     try {
    //         const { uuid, login_status, date, date_time } = agentLoginLogoutReportDto;
    //         let getPreviousEntryOfAgent = await this.agent_login_logout_report.findOne( { agent_uuid: uuid } ).sort( { _id: -1 } ).exec();
    //         console.log( getPreviousEntryOfAgent );
    //         let currentDateTime = new Date();
    //         agentLoginLogoutReportDto.agent_uuid = uuid;
    //         agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
    //         let utCDate = new Date().toISOString();
    //         agentLoginLogoutReportDto.date_time = utCDate;

    //         if (login_status == "0") {
    //             let getFollowup = await this.follow_up.find({ user_uuid: uuid, is_readed: "0" }).exec();
    //             let currentDateTime = new Date();
    //             for (let i = 0; i < getFollowup.length; i++) {
    //                 let followupDateTime = new Date(getFollowup[i].reminder_date_time.toString());
    //                 if (followupDateTime <= currentDateTime) {
    //                     // Update is_readed to '1'
    //                     await this.follow_up.updateOne({ _id: getFollowup[i]._id }, { $set: { is_readed: '1' } }).exec();
    //                     console.log("Updated is_readed for follow-up with id: " + getFollowup[i]._id);
    //                 }
    //             }
    //         }


    //         // if ( getPreviousEntryOfAgent != null && ( getPreviousEntryOfAgent.login_status == "1" || getPreviousEntryOfAgent.login_status == "0" ) && login_status == '0' ) {
    //         //     let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getMinutes() - 1 ) );
    //         if ( getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "0" && login_status == '0' && getPreviousEntryOfAgent.breakcode_uuid != undefined ) {
    //             // let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getMinutes() - 1 ) );

    //             //Add login entry first
    //             // let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             // agentLoginLogoutReportDto.login_status = "0";
    //             // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
    //             // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

    //             //Add logout entry
    //             // logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             // agentLoginLogoutReportDto.login_status = "2";
    //             // delete agentLoginLogoutReportDto.createdAt;

    //             // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


    //             let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "2";
    //             // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


    //             //adesh login entry first
    //             logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "0";
    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );



    //             return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Agent entry added successfully" );
    //         } else if ( getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == '0' && getPreviousEntryOfAgent.date != agentLoginLogoutReportDto.date && agentLoginLogoutReportDto.login_status == '2' ) {
    //             const previousDay = new Date( currentDateTime );
    //             previousDay.setDate( currentDateTime.getDate() - 1 );
    //             previousDay.setHours( 23, 59, 59, 999 );
    //             console.log( previousDay );
    //             const utcDateString = previousDay.toISOString();
    //             console.log( utcDateString );
    //             const formattedDateString = utcDateString.slice( 0, -1 ) + "99Z";
    //             console.log( formattedDateString );
    //             // const currentstartdate = new Date( agentLoginLogoutReportDto.date_time );
    //             // console.log( currentstartdate );
    //             // currentstartdate.setDate( currentstartdate.getDate() );
    //             // console.log( currentstartdate );
    //             // currentstartdate.setHours( 0, 0, 0, 0 );
    //             // console.log( currentstartdate )
    //             const dateString = agentLoginLogoutReportDto.date_time;
    //             const timestamp = Date.parse( dateString );
    //             const currentstartdate = new Date( timestamp );
    //             currentstartdate.setHours( 0, 0, 0, 0 ); // Set time to start of the day (00:00:00)
    //             const startutcDateString = currentstartdate.toISOString();
    //             const startformattedDateString = startutcDateString.slice( 0, -1 ) + "99Z";
    //             console.log( startformattedDateString );

    //             let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "2";
    //             agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
    //             agentLoginLogoutReportDto.date_time = formattedDateString;
    //             agentLoginLogoutReportDto.createdAt = utcDateString;
    //             // agentLoginLogoutReportDto.updatedAt = utcDateString;

    //             // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

    //             logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             agentLoginLogoutReportDto.login_status = "0";
    //             agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
    //             agentLoginLogoutReportDto.date_time = startformattedDateString;
    //             agentLoginLogoutReportDto.createdAt = startutcDateString;
    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


    //             logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
    //             delete agentLoginLogoutReportDto.createdAt;
    //             agentLoginLogoutReportDto.login_status = "2";
    //             agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
    //             agentLoginLogoutReportDto.date_time = utCDate;

    //             this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


    //             return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Agent entry added successfully" );

    //         } else {
    //             agentLoginLogoutReportDto.login_status = login_status;
    //             delete agentLoginLogoutReportDto.createdAt;
    //             console.log( agentLoginLogoutReportDto );
    //             let logMessages = { logSuccessMsg: `Agent entry added successfully` };
    //             return this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );
    //         }

    //     } catch ( error ) {
    //         Logger.error( "Error in adding agent entry in report", error.message );
    //     }
    // }

    async addAgentEntry(agentLoginLogoutReportDto: AgentLoginLogoutReportDto) {
        try {
            const { uuid, login_status, date, date_time } = agentLoginLogoutReportDto;
            let getPreviousEntryOfAgent = await this.agent_login_logout_report.findOne({ agent_uuid: uuid }).sort({ _id: -1 }).exec();
            console.log(getPreviousEntryOfAgent);
            let currentDateTime = new Date();
            agentLoginLogoutReportDto.agent_uuid = uuid;
            agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
            let utCDate = new Date().toISOString();
            agentLoginLogoutReportDto.date_time = utCDate;


            if (login_status == "0" && agentLoginLogoutReportDto.breakcode_uuid == undefined) {
                let getFollowup = await this.follow_up.find({ user_uuid: uuid, is_readed: "0" }).exec();
                let currentDateTime = new Date();
                for (let i = 0; i < getFollowup.length; i++) {
                    let followupDateTime = new Date(getFollowup[i].reminder_date_time.toString());
                    if (followupDateTime <= currentDateTime) {
                        // Update is_readed to '1'
                        await this.follow_up.updateOne({ _id: getFollowup[i]._id }, { $set: { is_readed: '1' } }).exec();
                        console.log("Updated is_readed for follow-up with id: " + getFollowup[i]._id);
                    }
                }
            }



            if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == '0' && getPreviousEntryOfAgent.date != agentLoginLogoutReportDto.date && login_status == '2') {
                const previousDay = new Date(currentDateTime);
                previousDay.setDate(currentDateTime.getDate() - 1);
                previousDay.setHours(23, 59, 59, 999);
                console.log(previousDay);
                const utcDateString = previousDay.toISOString();
                console.log(utcDateString);
                const formattedDateString = utcDateString.slice(0, -1) + "99Z";
                console.log(formattedDateString);
                // const currentstartdate = new Date( agentLoginLogoutReportDto.date_time );
                // console.log( currentstartdate );
                // currentstartdate.setDate( currentstartdate.getDate() );
                // console.log( currentstartdate );
                // currentstartdate.setHours( 0, 0, 0, 0 );
                // console.log( currentstartdate )
                const dateString = agentLoginLogoutReportDto.date_time;
                const timestamp = Date.parse(dateString);
                const currentstartdate = new Date(timestamp);
                currentstartdate.setHours(0, 0, 0, 0); // Set time to start of the day (00:00:00)
                const startutcDateString = currentstartdate.toISOString();
                const startformattedDateString = startutcDateString.slice(0, -1) + "99Z";
                console.log(startformattedDateString);

                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = formattedDateString;
                agentLoginLogoutReportDto.createdAt = utcDateString;
                // agentLoginLogoutReportDto.updatedAt = utcDateString;

                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = startformattedDateString;
                agentLoginLogoutReportDto.createdAt = startutcDateString;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                delete agentLoginLogoutReportDto.createdAt;
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = utCDate;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));




            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == '0' && getPreviousEntryOfAgent.date != agentLoginLogoutReportDto.date && agentLoginLogoutReportDto.login_status == '0') {
                const previousDay = new Date(currentDateTime);
                previousDay.setDate(currentDateTime.getDate() - 1);
                previousDay.setHours(23, 59, 59, 999);
                console.log(previousDay);
                const utcDateString = previousDay.toISOString();
                console.log(utcDateString);
                const formattedDateString = utcDateString.slice(0, -1) + "99Z";
                console.log(formattedDateString);
                // const currentstartdate = new Date( agentLoginLogoutReportDto.date_time );
                // console.log( currentstartdate );
                // currentstartdate.setDate( currentstartdate.getDate() );
                // console.log( currentstartdate );
                // currentstartdate.setHours( 0, 0, 0, 0 );
                // console.log( currentstartdate )
                const dateString = agentLoginLogoutReportDto.date_time;
                const timestamp = Date.parse(dateString);
                const currentstartdate = new Date(timestamp);
                currentstartdate.setHours(0, 0, 0, 0); // Set time to start of the day (00:00:00)
                const startutcDateString = currentstartdate.toISOString();
                const startformattedDateString = startutcDateString.slice(0, -1) + "99Z";
                console.log(startformattedDateString);

                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = formattedDateString;
                agentLoginLogoutReportDto.createdAt = utcDateString;
                // agentLoginLogoutReportDto.updatedAt = utcDateString;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                delete agentLoginLogoutReportDto.createdAt;
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = utCDate;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));




            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == '1' && getPreviousEntryOfAgent.date != agentLoginLogoutReportDto.date && agentLoginLogoutReportDto.login_status == '0') {
                const firstpreviousDay = new Date(currentDateTime);
                firstpreviousDay.setDate(currentDateTime.getDate() - 1);
                firstpreviousDay.setHours(23, 59, 55, 999);
                console.log(firstpreviousDay);
                const firstutcDateString = firstpreviousDay.toISOString();
                console.log(firstutcDateString);
                const firstformattedDateString = firstutcDateString.slice(0, -1) + "99Z";
                console.log(firstformattedDateString);

                const secondpreviousDay = new Date(currentDateTime);
                secondpreviousDay.setDate(currentDateTime.getDate() - 1);
                secondpreviousDay.setHours(23, 59, 59, 999);
                console.log(secondpreviousDay);
                const secondutcDateString = secondpreviousDay.toISOString();
                console.log(secondutcDateString);
                const secondformattedDateString = secondutcDateString.slice(0, -1) + "99Z";
                console.log(secondformattedDateString);
                // const currentstartdate = new Date( agentLoginLogoutReportDto.date_time );
                // console.log( currentstartdate );
                // currentstartdate.setDate( currentstartdate.getDate() );
                // console.log( currentstartdate );
                // currentstartdate.setHours( 0, 0, 0, 0 );
                // console.log( currentstartdate )
                const dateString = agentLoginLogoutReportDto.date_time;
                const timestamp = Date.parse(dateString);
                const currentstartdate = new Date(timestamp);
                currentstartdate.setHours(0, 0, 0, 0); // Set time to start of the day (00:00:00)
                const startutcDateString = currentstartdate.toISOString();
                const startformattedDateString = startutcDateString.slice(0, -1) + "99Z";
                console.log(startformattedDateString);

                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.breakcode_uuid = getPreviousEntryOfAgent.breakcode_uuid;
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = firstformattedDateString;
                agentLoginLogoutReportDto.createdAt = firstutcDateString;
                // agentLoginLogoutReportDto.updatedAt = utcDateString;

                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = secondformattedDateString;
                agentLoginLogoutReportDto.createdAt = secondutcDateString;
                delete agentLoginLogoutReportDto.breakcode_uuid;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                delete agentLoginLogoutReportDto.createdAt;
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = utCDate;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));




            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "0" && login_status == '0' && agentLoginLogoutReportDto.breakcode_uuid != '') {
                let currentDateTime = new Date();
                let manualLogoutEntry = new Date(currentDateTime.getTime() - 5000);
                console.log(manualLogoutEntry);

                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "1";
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                //adesh login entry first
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                delete agentLoginLogoutReportDto.createdAt;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry added successfully");

            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "0" && login_status == '0') {
                // let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getSeconds() - 5 ) );
                let currentDateTime = new Date();
                let manualLogoutEntry = new Date(currentDateTime.getTime() - 5000);
                console.log(manualLogoutEntry);

                //Add login entry first
                // let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "0";
                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

                //Add logout entry
                // logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "2";
                // delete agentLoginLogoutReportDto.createdAt;

                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                //adesh login entry first
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                delete agentLoginLogoutReportDto.createdAt;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));



                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry added successfully");

            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "1" && login_status == '0' && (agentLoginLogoutReportDto.breakcode_uuid == '' || agentLoginLogoutReportDto.breakcode_uuid == undefined)) {
                // let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getSeconds() - 5 ) );
                let currentDateTime = new Date();
                let manualLogoutEntry = new Date(currentDateTime.getTime() - 5000);
                console.log(manualLogoutEntry);

                //Add login entry first
                // let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "0";
                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

                //Add logout entry
                // logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "2";
                // delete agentLoginLogoutReportDto.createdAt;

                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // agentLoginLogoutReportDto.date_time = manualLogoutEntry.toISOString();
                agentLoginLogoutReportDto.breakcode_uuid = getPreviousEntryOfAgent.breakcode_uuid;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // agentLoginLogoutReportDto.date_time = manualLogoutEntry.toISOString();
                delete agentLoginLogoutReportDto.breakcode_uuid;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                //adesh login entry first
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                // agentLoginLogoutReportDto.date_time = utCDate;
                delete agentLoginLogoutReportDto.createdAt;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));



                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry added successfully");
            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "0" && (getPreviousEntryOfAgent.breakcode_uuid != '' || getPreviousEntryOfAgent.breakcode_uuid != undefined) && login_status == '0') {
                // let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getSeconds() - 5 ) );
                let currentDateTime = new Date();
                let manualLogoutEntry = new Date(currentDateTime.getTime() - 5000);
                console.log(manualLogoutEntry);

                //Add login entry first
                // let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "0";
                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

                //Add logout entry
                // logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "2";
                // delete agentLoginLogoutReportDto.createdAt;

                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                //adesh login entry first
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                delete agentLoginLogoutReportDto.createdAt;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));



                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry added successfully");
            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "1" && (getPreviousEntryOfAgent.breakcode_uuid != '' || getPreviousEntryOfAgent.breakcode_uuid != undefined) && login_status == '2') {
                // let manualLogoutEntry = new Date( currentDateTime.setMinutes( currentDateTime.getSeconds() - 5 ) );
                let currentDateTime = new Date();
                let manualLogoutEntry = new Date(currentDateTime.getTime() - 5000);
                console.log(manualLogoutEntry);

                //Add login entry first
                // let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "0";
                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );

                //Add logout entry
                // logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                // agentLoginLogoutReportDto.login_status = "2";
                // delete agentLoginLogoutReportDto.createdAt;

                // this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );


                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.breakcode_uuid = getPreviousEntryOfAgent.breakcode_uuid;
                agentLoginLogoutReportDto.createdAt = manualLogoutEntry;

                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                //adesh login entry first
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                delete agentLoginLogoutReportDto.breakcode_uuid
                delete agentLoginLogoutReportDto.createdAt;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));



                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry added successfully");
            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "0" && getPreviousEntryOfAgent.date != agentLoginLogoutReportDto.date && agentLoginLogoutReportDto.breakcode_uuid != undefined) {
                const previousDay = new Date(currentDateTime);
                previousDay.setDate(currentDateTime.getDate() - 1);
                previousDay.setHours(23, 59, 59, 999);
                console.log(previousDay);
                const utcDateString = previousDay.toISOString();
                console.log(utcDateString);
                const formattedDateString = utcDateString.slice(0, -1) + "99Z";
                console.log(formattedDateString);
                // const currentstartdate = new Date( agentLoginLogoutReportDto.date_time );
                // console.log( currentstartdate );
                // currentstartdate.setDate( currentstartdate.getDate() );
                // console.log( currentstartdate );
                // currentstartdate.setHours( 0, 0, 0, 0 );
                // console.log( currentstartdate )
                const dateString = agentLoginLogoutReportDto.date_time;
                const timestamp = Date.parse(dateString);
                const currentstartdate = new Date(timestamp);
                currentstartdate.setHours(0, 0, 0, 0); // Set time to start of the day (00:00:00)
                const startutcDateString = currentstartdate.toISOString();
                const startformattedDateString = startutcDateString.slice(0, -1) + "99Z";
                console.log(startformattedDateString);

                let logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "2";
                let temp_breakcode_uuid = agentLoginLogoutReportDto.breakcode_uuid;
                delete agentLoginLogoutReportDto.breakcode_uuid;
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = formattedDateString;
                agentLoginLogoutReportDto.createdAt = utcDateString;
                // agentLoginLogoutReportDto.updatedAt = utcDateString;

                // agentLoginLogoutReportDto.createdAt = manualLogoutEntry;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.breakcode_uuid = temp_breakcode_uuid;
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = startformattedDateString;
                agentLoginLogoutReportDto.createdAt = startutcDateString;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));


                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                delete agentLoginLogoutReportDto.createdAt;
                agentLoginLogoutReportDto.login_status = login_status;
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = utCDate;

                return this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "2" && agentLoginLogoutReportDto.breakcode_uuid != "") {
                const dateString = new Date(agentLoginLogoutReportDto.date_time);
                const currentstartdate = new Date(dateString.getTime() - 10000);
                const startutcDateString = currentstartdate.toISOString();
                const startformattedDateString = startutcDateString.slice(0, -1) + "99Z";
                // console.log(startformattedDateString);

                const secondDatestring = new Date(agentLoginLogoutReportDto.date_time);
                const secondCurrentstartdate = new Date(secondDatestring.getTime() - 5000);
                const secondStartutcDateString = secondCurrentstartdate.toISOString();
                const secondStartformattedDateString = secondStartutcDateString.slice(0, -1) + "99Z";
                // console.log(secondStartformattedDateString);

                let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                agentLoginLogoutReportDto.login_status = "0";
                agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                agentLoginLogoutReportDto.date_time = startformattedDateString;
                agentLoginLogoutReportDto.createdAt = startutcDateString;
                let temp_breakcode_uuid = agentLoginLogoutReportDto.breakcode_uuid;
                delete agentLoginLogoutReportDto.breakcode_uuid;
                this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

                if (login_status == "0") {
                    let logMessages = { logSuccessMsg: `Agent login entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                    agentLoginLogoutReportDto.login_status = "1";
                    agentLoginLogoutReportDto.date = getPreviousEntryOfAgent.date.toString();
                    agentLoginLogoutReportDto.date_time = secondStartformattedDateString;
                    agentLoginLogoutReportDto.createdAt = secondStartutcDateString;
                    agentLoginLogoutReportDto.breakcode_uuid = temp_breakcode_uuid;
                    this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));
                }
                logMessages = { logSuccessMsg: `Agent logout entry was missing , newly entry added by subtracting 1 minute from current time successfully` };
                delete agentLoginLogoutReportDto.createdAt;
                agentLoginLogoutReportDto.login_status = login_status;
                agentLoginLogoutReportDto.breakcode_uuid = temp_breakcode_uuid;
                agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
                agentLoginLogoutReportDto.date_time = utCDate;

                return this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));

            } else if (getPreviousEntryOfAgent != null && getPreviousEntryOfAgent.login_status == "2" && login_status == '2') {
                let result = await this.agent_login_logout_report.findOneAndUpdate(
                    { agent_uuid: uuid },
                    { $set: agentLoginLogoutReportDto },
                    { sort: { _id: -1 } }
                ).exec();
                return { statusCode: 200, data: result, message: "Agent entry updated successfully" }
            } else {
                let current_break_name = "";
                let current_break_duration = "";
                if (login_status == "1" && agentLoginLogoutReportDto.breakcode_uuid) {
                    const findBreakcode = await this.breakcode.findOne({ uuid: agentLoginLogoutReportDto.breakcode_uuid }).exec();
                    if (findBreakcode) {
                        current_break_name = findBreakcode.name.toString();
                        current_break_duration = findBreakcode.duration.toString();
                        await this.agent_live_report.updateOne(
                            { agent_uuid: uuid },
                            { $set: { break_name: current_break_name, break_duration: current_break_duration } }
                        ).exec();
                    }
                }

                agentLoginLogoutReportDto.login_status = login_status;
                delete agentLoginLogoutReportDto.createdAt;
                console.log(agentLoginLogoutReportDto);
                let logMessages = { logSuccessMsg: `Agent entry added successfully` };
                return this.commonDbFn.insert(this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify(logMessages));
            }

        } catch (error) {
            Logger.error("Error in adding agent entry in report", error.message);
        }
    }

    // async fetchLoginLogoutReportStatistics ( queryParams ) {
    //     const { uuid, tenant_uuid } = queryParams;
    //     let match = { agent_uuid: uuid, tenant_uuid };

    //     let groupByDetails = {
    //         _id: "$date",
    //         data: {
    //             $push: { login_status: "$login_status", date: "$createdAt" }
    //         },
    //         "date": { "$first": "$date" },
    //         "createdAt": { "$first": "$createdAt" }
    //     }

    //     let sort = { date: -1 };
    //     let projection = { "data": 1, "date": 1, createdAt: 1 }
    //     let response = await this.commonDbFn.fetchDataByGroup( this.agent_login_logout_report, match, "", groupByDetails, sort, "", projection );

    //     let i, grossHours, finalArray = [], obj = {}, dateLen, effectiveHours;
    //     let len = response.length;

    //     for ( i = 0; i <= len; i++ ) {
    //         if ( response[ i ]?.data.length ) {
    //             dateLen = response[ i ]?.data.length;

    //             grossHours = this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
    //             effectiveHours = await this.getEffectiveHours( response[ i ]?.data )
    //             grossHours = grossHours == undefined ? "0h 0m" : grossHours;
    //             effectiveHours = effectiveHours == undefined ? "0h 0m" : grossHours - effectiveHours;

    //             obj = {
    //                 date: response[ i ]?.date,
    //                 effectiveHours: this.getTimeInHoursAndMinutes( effectiveHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( effectiveHours ),
    //                 grossHours: this.getTimeInHoursAndMinutes( grossHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( grossHours ),
    //                 createdAt: response[ i ]?.createdAt,
    //             };
    //             finalArray.push( obj );
    //         }
    //     }

    //     let statusCode = finalArray.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    //     return this.commonDbFn.sendResponseWithMessage( statusCode, finalArray );
    // }

    async fetchLoginLogoutReportStatistics(queryParams) {
        const { uuid, tenant_uuid, limit } = queryParams;
        let match = { agent_uuid: uuid, tenant_uuid };
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);

        let groupByDetails = {
            _id: "$date",
            data: {
                $push: { login_status: "$login_status", date: "$createdAt", breakcode_uuid: "$breakcode_uuid" }
            },
            "date": { "$first": "$date" },
            "createdAt": { "$first": "$createdAt" },
        }

        let sort = { date: -1 };
        // let newlimit = parseInt( limit, 10 );
        let projection = { "data": 1, "date": 1, "createdAt": 1 }
        let response = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, match, "", groupByDetails, sort, perPage, projection, "", skip);
        let newresponse = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, match, "", groupByDetails, sort, "", projection);
        // let i, grossHours, finalArray = [], obj = {}, dateLen, effectiveHours;
        // let len = response.length;

        // for ( i = 0; i <= len; i++ ) {
        //     if ( response[ i ]?.data.length ) {
        //         dateLen = response[ i ]?.data.length;

        //         grossHours = this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
        //         effectiveHours = await this.getEffectiveHours( response[ i ]?.data )
        //         grossHours = grossHours == undefined ? "0h 0m" : grossHours;
        //         effectiveHours = effectiveHours == undefined ? "0h 0m" : grossHours - effectiveHours;

        //         obj = {
        //             date: response[ i ]?.date,
        //             effectiveHours: this.getTimeInHoursAndMinutes( effectiveHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( effectiveHours ),
        //             grossHours: this.getTimeInHoursAndMinutes( grossHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( grossHours )
        //         };
        //         finalArray.push( obj );
        //     }
        // }

        let i, grossHours, finalArray = [], obj = {}, dateLen, last_login_date, effectiveHours, createdAt, count, login_stat, first, last, last_converted_date, first_converted_date, total_break_hours, breakcount;
        let len = response.length;


        for (i = 0; i <= len; i++) {
            if (response[i]?.data.length) {
                // console.log( response[ i ] );
                dateLen = response[i]?.data.length;
                // console.log( response[ i ].data[ i ].agent );
                // grossHours = await this.get_loginhours( response[ i ].data );
                grossHours = await this.calculateHours(response[i]?.data[0].date, response[i]?.data[dateLen - 1].date);
                console.log('login_hours', grossHours)
                // grossHours = await this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
                login_stat = await this.login_count(response[i]?.data, 'login_count');
                breakcount = await this.login_count(response[i]?.data, 'break_count');
                first = response[i]?.data[0].date;
                // first_converted_date = moment( first ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                first_converted_date = moment.tz(first, queryParams.timezone).format("HH:mm");
                last_login_date = await this.get_last_login_date(response[i].data)
                // console.log( last_login_date );
                last = last_login_date == '' ? '00:00' : last_login_date;
                // console.log( last );
                if (last != '00:00') {
                    // last_converted_date = moment( last ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                    last_converted_date = moment.tz(last, queryParams.timezone).format("HH:mm");
                } else {
                    last_converted_date = last;
                }

                // last = response[ i ]?.data[ dateLen - 1 ].date;

                total_break_hours = await this.get_breakhours(response[i].data);
                // console.log( 'break_hours', total_break_hours );
                // grossHours = grossHours == undefined ? "0h 0m" : grossHours;
                // total_break_hours = total_break_hours == undefined ? "0h 0m" : grossHours - total_break_hours;
                obj = {
                    date: response[i]?.date,
                    total_login_hours: this.getTimeInHoursAndMinutes(grossHours) == undefined ? "00:00" : this.getTimeInHoursAndMinutes(grossHours),
                    first_login_time: first_converted_date,
                    last_login_time: last_converted_date,
                    login_count: login_stat,
                    break_count: breakcount,
                    total_break_hours: this.getTimeInHoursAndMinutes(total_break_hours) == undefined ? "00:00" : this.getTimeInHoursAndMinutes(total_break_hours),
                    createdAt: response[i].createdAt



                };
                finalArray.push(obj);
            }
        }

        if (newresponse.length > 0) {
            count = newresponse.length;
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, finalArray, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, finalArray, count)
        }

        let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage(statusCode, response);
    }

    /*
    @Usage             : To get effective hours of logged in user by each date
    @Param allEntries  : Array of each date
    @return String     : gross hours
    */

    async getEffectiveHours(allEntries) {
        allEntries.shift();
        allEntries.pop();
        let effectiveHours = this.calculateEffectiveHours(allEntries);
        return effectiveHours
    }

    /*
    @Usage             : Calculate effective hours of logged in user by each date
    @Param allEntries  : Array of each date
    @return String     : difference between dates
    */

    async calculateEffectiveHours(allDates) {
        let i, calculateHours, effectiveHours = [];
        let len = allDates.length;
        len = len / 2;

        for (i = 0; i < len; i++) {
            try {
                calculateHours = this.calculateHours(allDates[i].date, allDates[i + 1].date, "EH");
                effectiveHours.push(calculateHours);
            } catch (error) {
                Logger.error("Error in calculating effective hours", error.message);
            }
        }

        // Do sum of all difference between dates
        var diff = effectiveHours.reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
        return diff;
    }

    /*
    @Usage             : Convert difference in hour and minute
    @Param diff        : Time difference
    @return String     : Format [Ex : 1h 2m]
    */

    // getTimeInHoursAndMinutes ( diff ) {
    //     if ( diff > 60e3 ) {
    //         let minutes = Math.floor( diff / 60e3 )
    //         var num = minutes;
    //         var hours = ( num / 60 );
    //         var rhours = Math.floor( hours );
    //         minutes = ( hours - rhours ) * 60;
    //         var rminutes = Math.round( minutes );
    //         return `${rhours}h ${rminutes}m`;
    //     }
    // }

    getTimeInHoursAndMinutes(diff) {
        if (diff > 60e3) {
            let minutes = Math.floor(diff / 60e3);
            let hours = Math.floor(minutes / 60);
            let remainingMinutes = minutes % 60;

            // Pad single-digit minutes with leading zero
            let formattedMinutes = remainingMinutes.toString().padStart(2, '0');

            // Pad single-digit hours with leading zero if needed
            let formattedHours = hours.toString().padStart(2, '0');

            return `${formattedHours}:${formattedMinutes}`;
        }
    }

    /*
    @Usage             : To calculate hours of logged in user by each date
    @Param startDate   : Start datetime of a day of logged in agent
    @Param endDate     : End datetime of a day of logged in agent
    @return Object     : Array of an object with total count of login logout report with data
    */

    calculateHours(startDate, endDate, type = "") {
        const date1: any = new Date(startDate);
        const date2: any = new Date(endDate);
        var diff = date2 - date1;
        return diff;
    }

    /*
    @Usage            : To fetch all login logout report entries based on date
    @Param queryParam : Params receive with request
    @return Object    : Array of an object with total count of login logout report with data
    */

    // async fetchLoginLogoutEntries ( queryParam ) {
    //     try {
    //         const { date, uuid } = queryParam;
    //         let finalDate, datesArray = [];
    //         if ( date != "" && date != undefined ) {
    //             let response = await this.agent_login_logout_report.find( { date, agent_uuid: uuid }, { date_time: 1, date: 1, createdAt: 1, _id: 0 } ).sort( { _id: 1 } ).exec();
    //             let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    //             /*response?.map( ( data ) => {
    //                 finalDate = data.date_time.replace( "T", " " ).substring( 0, 19 );
    //                 datesArray.push( finalDate );
    //             } );*/
    //             return this.commonDbFn.sendResponseWithMessage( statusCode, response );
    //         }
    //     } catch ( error ) {
    //         Logger.error( `Unable to fetch details`, error.message );
    //         return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Unable to fetch details` );
    //     }
    // }

    async fetchLoginLogoutEntries(queryParam) {
        try {
            const { date, uuid } = queryParam;
            let finalDate, datesArray = [];
            let populateFields = [{ path: "breakcode", select: "name break_code duration" }];
            if (date != "" && date != undefined) {
                // let response = await this.agent_login_logout_report.find( { date, agent_uuid: uuid }, { date_time: 1, date: 1, createdAt: 1, login_status: 1, breakcode_uuid: 1 } ).sort( { _id: 1 } ).exec();
                let response = await this.agent_login_logout_report.find({ date, agent_uuid: uuid }, { date_time: 1, date: 1, createdAt: 1, login_status: 1, breakcode_uuid: 1 }).populate(populateFields).sort({ _id: 1 }).exec();
                let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
                // response?.map( ( data ) => {
                //     finalDate = data.date_time.replace( "T", " " ).substring( 0, 19 );
                //     datesArray.push( finalDate );
                // } );
                return this.commonDbFn.sendResponseWithMessage(statusCode, response);
            }
        } catch (error) {
            Logger.error(`Unable to fetch details`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to fetch details`);
        }
    }

    async advancedSearch(searchParams) {
        // let match, response, count = 0;
        let j, objlen, searchobj, dateobj;
        let objectKeys, objectValues, filedName, filedValue, searchFlag, match: any = [], key, response, newresponse, count = 0;

        console.log(searchParams);
        let { role, tenant_uuid, uuid, timezone } = searchParams;
        match.push({ tenant_uuid: tenant_uuid, agent_uuid: uuid });
        delete searchParams.tenant_uuid;


        // let populateFields = [ { path: "agent_uuid", select: 'user_name username' } ];
        // let lookupDetails = { from: "user", localField: "agent_uuid", foreignField: "uuid", as: "agent" };
        // let unwindAgent = { $unwind: "$agent" };
        let projection = { "data": 1, "date": 1, "createdAt": 1 }
        if (searchParams.startDate != undefined && searchParams.endDate != undefined) {
            let startDate = searchParams.startDate.substring(0, 10);

            let endDate = searchParams.endDate.substring(0, 10);

            // if ( agent_uuid != undefined ) {
            //      match = {
            //           $and: [
            //                { tenant_uuid: tenant_uuid },
            //                { agent_uuid: agent_uuid },
            //                { date: { "$gte": `${startDate}`, "$lte": `${endDate}` } }
            //           ]
            //      };
            // } else {
            // match = {
            //      $and: [
            //           { tenant_uuid: tenant_uuid },
            //           { date: { "$gte": `${startDate}`, "$lte": `${endDate}` } }
            //      ]
            // };
            dateobj = { "date": { "$gte": `${startDate}`, "$lte": `${endDate}` } };
            match.push(dateobj);
            // }

        }
        // else {
        //      if ( agent_uuid != undefined ) {
        //           match = { tenant_uuid: tenant_uuid, agent_uuid: searchParams.agent_uuid };
        //      }
        // }



        //Pagination
        const perPage = Number(searchParams.limit) || 10;
        const currentPage = Number(searchParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        //End

        delete searchParams.startDate;
        delete searchParams.endDate;
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.timezone;
        delete searchParams.uuid;
        delete searchParams.manager_uuid;
        delete searchParams.concurrent_calls;
        delete searchParams.assigned_manager_role;
        delete searchParams.limit;
        delete searchParams.page;

        objectKeys = Object.keys(searchParams);
        objectValues = Object.values(searchParams);
        objlen = objectKeys.length;

        /*if (len == 0) {
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
        }*/

        for (j = 0; j < objlen; j++) {
            filedName = objectKeys[j];
            filedValue = objectValues[j];
            if (filedName.includes("|")) {
                key = filedName.split("|")[0].trim();
                searchFlag = parseInt(filedName.split("|")[1].trim());
            } else {
                key = filedName;
                searchFlag = -1;
            }

            switch (searchFlag) {
                case 1: //Begins with
                    searchobj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    match.push(searchobj);
                    break;
                case 2: // Contains
                    searchobj = { [key]: { $regex: filedValue, $options: "i" } };
                    match.push(searchobj);
                    break;
                case 3: // Does not contains
                    searchobj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    match.push(searchobj);
                    break;
                case 4: // Is equal to
                    searchobj = { [key]: filedValue };
                    match.push(searchobj);
                    break;
                case 5: // In not equal to
                    searchobj = { [key]: { $ne: filedValue } };
                    match.push(searchobj);
                    break;
                case 6: //Ends with
                    searchobj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    match.push(searchobj);
                    break;

                default: //Begins with
                    searchobj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    match.push(searchobj);
                    break;
            }
        }


        let groupByDetails = {
            _id: { date: "$date" },
            data: {
                $push: { login_status: "$login_status", date: "$createdAt", breakcode_uuid: "$breakcode_uuid" }
            },
            "date": { "$first": "$date" },
            "createdAt": { "$first": "$createdAt" }
        }

        response = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, { $and: match }, "", groupByDetails, "", perPage, projection, "", skip);
        newresponse = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, { $and: match }, "", groupByDetails, "", "", projection);

        let i, grossHours, finalArray = [], obj = {}, dateLen, effectiveHours, createdAt, login_stat, first, last_login_date, last, last_converted_date, first_converted_date, total_break_hours, breakcount;
        let len = response.length;

        // for ( i = 0; i <= len; i++ ) {
        //      if ( response[ i ]?.data.length ) {
        //           dateLen = response[ i ]?.data.length;
        //           grossHours = this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
        //           effectiveHours = await this.getEffectiveHours( response[ i ]?.data )
        //           grossHours = grossHours == undefined ? "0h 0m" : grossHours;
        //           effectiveHours = effectiveHours == undefined ? "0h 0m" : grossHours - effectiveHours;
        //           obj = {
        //                date: response[ i ]?.date,
        //                effectiveHours: this.getTimeInHoursAndMinutes( effectiveHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( effectiveHours ),
        //                grossHours: this.getTimeInHoursAndMinutes( grossHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( grossHours ),
        //                agent_uuid: response[ i ].agent_uuid,
        //                createdAt: response[ i ].createdAt,


        //           };
        //           finalArray.push( obj );
        //      }
        // }

        for (i = 0; i <= len; i++) {
            if (response[i]?.data.length) {
                // console.log( response[ i ] );
                dateLen = response[i]?.data.length;
                // console.log( response[ i ].data[ i ] );
                grossHours = await this.calculateHours(response[i]?.data[0].date, response[i]?.data[dateLen - 1].date);
                login_stat = await this.login_count(response[i]?.data, 'login_count');
                breakcount = await this.login_count(response[i]?.data, 'break_count');
                first = response[i]?.data[0].date;
                // first_converted_date = moment( first ).utcOffset( timezone ).format( "HH:mm" );
                first_converted_date = moment.tz(first, timezone).format("HH:mm");
                // last = response[ i ]?.data[ dateLen - 1 ].date;
                // last_converted_date = moment( last ).utcOffset( timezone ).format( "HH:mm" );
                // last_converted_date = moment.tz( last, timezone ).format( "HH:mm" );
                last_login_date = await this.get_last_login_date(response[i].data)
                // console.log( last_login_date );
                last = last_login_date == '' ? '00:00' : last_login_date;
                // console.log( last );
                if (last != '00:00') {
                    // last_converted_date = moment( last ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                    last_converted_date = moment.tz(last, timezone).format("HH:mm");
                } else {
                    last_converted_date = last;
                }
                total_break_hours = await this.get_breakhours(response[i].data);
                // console.log( 'break_hours', total_break_hours );
                grossHours = grossHours == undefined ? "00:00" : grossHours;
                // total_break_hours = total_break_hours == undefined ? "0h 0m" : grossHours - total_break_hours;
                obj = {
                    date: response[i]?.date,
                    total_login_hours: this.getTimeInHoursAndMinutes(grossHours) == undefined ? "00:00" : this.getTimeInHoursAndMinutes(grossHours),
                    first_login_time: first_converted_date,
                    last_login_time: last_converted_date,
                    login_count: login_stat,
                    break_count: breakcount,
                    total_break_hours: this.getTimeInHoursAndMinutes(total_break_hours) == undefined ? "00:00" : this.getTimeInHoursAndMinutes(total_break_hours),
                    createdAt: response[i].createdAt


                };
                finalArray.push(obj);
            }
        }






        if (newresponse.length > 0) {
            count = newresponse.length;
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, finalArray, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, finalArray, count)
        }
    }

    async get_breakhours(alldata) {
        let i, j, calculateHours, effectiveHours = [], breakentries = [];
        let len = alldata.length;
        for (i = 0; i < len; i++) {
            if (alldata[i].breakcode_uuid != undefined && alldata[i].breakcode_uuid != '') {
                breakentries.push(alldata[i]);
            }
        }

        let break_len = breakentries.length;
        break_len = break_len / 2;

        for (j = 0; j < break_len; j++) {
            try {
                calculateHours = this.calculateHours(breakentries[j].date, breakentries[j + 1].date, "EH");
                effectiveHours.push(calculateHours);
            } catch (error) {
                Logger.error("Error in calculating effective hours", error.message);
            }
        }
        // console.log( effectiveHours );

        var diff = effectiveHours.reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
        return diff;

    }

    async get_last_login_date(alldates) {
        let i, logout_len, logout_date, logoutentries = [];
        let len = alldates.length;
        // console.log( len );
        for (i = 0; i < len; i++) {
            if (alldates[i].login_status != "" && alldates[i].login_status == '2') {
                logoutentries.push(alldates[i])
                // console.log( alldates[ i ] )
            }
        }

        logout_len = logoutentries.length;
        // console.log( logout_len );
        if (logout_len > 0) {
            logout_date = logoutentries[logout_len - 1].date
        } else {
            logout_date = ''
        }

        return logout_date;

    }

    async get_loginhours(alldata) {
        let i, j, calculateHours, effectiveHours = [], loginentries = [];
        let len = alldata.length;
        for (i = 0; i < len; i++) {
            if (alldata[i].breakcode_uuid == undefined) {
                loginentries.push(alldata[i])
            }
        }

        let login_len = loginentries.length;
        login_len = login_len / 2;

        for (j = 0; j < login_len; j++) {
            try {
                calculateHours = this.calculateHours(loginentries[j].date, loginentries[j + 1].date, "EH");
                effectiveHours.push(calculateHours);
            } catch (error) {
                Logger.error("Error in calculating effective hours", error.message);
            }
        }

        console.log(effectiveHours)
        var diff = effectiveHours.reduce((accumulator, currentValue) => {
            return accumulator + currentValue
        }, 0);
        return diff;
    }

    async login_count(alldata, login_state) {
        let i, count = 0;
        let len = alldata.length;

        for (i = 0; i < len; i++) {
            if (login_state == 'login_count') {
                if (alldata[i].login_status == '0' && alldata[i].breakcode_uuid == undefined) {
                    count = count + 1;
                    // console.log( 'login_count', count )
                }
            } else if (login_state == 'break_count') {
                if (alldata[i].login_status == '1') {
                    count = count + 1;
                    // console.log( 'breakcount', count )
                }
            }


        }
        // console.log( count );
        return count;
    }


    /********************** Agent Campaign Report *****************************/

    /*
    @Usage                        : To add agent campaign entry
    @Param  addAgentCampaignEntry : Campaign details
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async addAgentCampaignLoginEntry(addAgentCampaignEntry, loggedInUserDetails) {
        const { campaigns_details } = addAgentCampaignEntry;
        const { uuid, tenant_uuid, manager_uuid } = loggedInUserDetails;
        let obj, allData = [];
        try {
            campaigns_details.map((data) => {
                obj = {
                    campaign_uuid: data.campaign_uuid,
                    login_status: data.login_status,
                    tenant_uuid: manager_uuid == undefined ? tenant_uuid : manager_uuid,
                    agent_uuid: uuid
                }
                allData.push(obj);
            });

            await this.agent_campaign_report.insertMany(allData, { ordered: false });
            await this.agent_campaign_login.deleteMany({ agent_uuid: uuid }).exec();
            await this.agent_campaign_login.insertMany(allData, { ordered: false });
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent entry for campaign added successfully");
        } catch (error) {
            Logger.error("Error in adding campaign entry for agent", error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Unable to add agent entry for campaign added successfully");
        }

    }

    /*
    @Usage                        : To add agent campaign busy entry
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async addAgentCampaignBusyEntry(loggedInUserDetails) {
        const { uuid, tenant_uuid } = loggedInUserDetails;
        let obj, allData = [];
        try {
            let todayDate = this.commonFn.getTodayDate();
            //Get all logged in campaigns of current logged in agent

            let match = { createdAt: { $regex: todayDate, $options: "i" } };
            let groupByDetails = {
                _id: { campaign_uuid: "$campaign_uuid", agent_uuid: "$agent_uuid" },
                "login_status": { "$first": "$login_status" }
            };

            let projection = { login_status: 1 };
            let response = await this.commonDbFn.fetchDataByGroup(this.agent_campaign_report, match, "", groupByDetails, "", "", projection);
            response.map((data) => {
                if (data.login_status == "0") {
                    obj = {
                        campaign_uuid: data._id.campaign_uuid,
                        login_status: "1",
                        tenant_uuid,
                        agent_uuid: uuid
                    }
                    allData.push(obj);
                }
            });
            if (allData.length > 0) {
                await this.agent_campaign_report.insertMany(allData);
                await this.agent_campaign_login.deleteMany({ login_status: "0", agent_uuid: uuid }).exec();
                await this.agent_campaign_login.insertMany(allData);
            }
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent busy entry for campaign added successfully");
        } catch (error) {
            Logger.error("Error in adding busy entry for agent", error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Unable to add agent busy entry for campaign added successfully");
        }
    }

    /*
    @Usage                        : To add agent campaign logout entry
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async agentlogoutCampaign(loggedInUserDetails) {
        const { uuid, tenant_uuid } = loggedInUserDetails;
        let obj, allData = [];
        try {
            let todayDate = this.commonFn.getTodayDate();
            let match = { createdAt: { $regex: todayDate, $options: "i" } };
            let groupByDetails = {
                _id: { campaign_uuid: "$campaign_uuid", agent_uuid: "$agent_uuid" },
                "login_status": { "$first": "$login_status" }
            };
            let sort = { createdAt: -1 };
            let projection = { login_status: 1 };
            let response = await this.commonDbFn.fetchDataByGroup(this.agent_campaign_report, match, "", groupByDetails, sort, "", projection);

            response.map((data) => {
                if (data.login_status == "1") { // Means agent done logout direct from break
                    let currentDateTime = new Date();
                    let manualLogoutEntry = new Date(currentDateTime.setMinutes(currentDateTime.getMinutes() - 1)).toISOString();
                    obj = {
                        campaign_uuid: data._id.campaign_uuid,
                        login_status: "0",
                        tenant_uuid,
                        agent_uuid: uuid,
                        createdAt: manualLogoutEntry
                    }
                    allData.push(obj);

                    obj = {
                        campaign_uuid: data._id.campaign_uuid,
                        login_status: "2",
                        tenant_uuid,
                        agent_uuid: uuid,
                    }
                    allData.push(obj);
                } else if (data._id.login_status == "0") {
                    obj = {
                        campaign_uuid: data._id.campaign_uuid,
                        login_status: "2",
                        tenant_uuid,
                        agent_uuid: uuid,
                    }
                    allData.push(obj);
                }
            });
            if (allData.length > 0) {
                await this.agent_campaign_report.insertMany(allData);
                await this.agent_campaign_login.deleteMany({ agent_uuid: uuid }).exec();
                await this.agent_campaign_login.insertMany(allData);
            }
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent logout entry for campaign added successfully");
        } catch (error) {
            Logger.error("Error in logout for agent campaign", error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Unable to logout");
        }
    }

    /*
    @Usage                        : To get campaign details
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async fetchCampaigns(loggedInUserDetails) {
        const { uuid, tenant_uuid } = loggedInUserDetails;
        let response, statusCode;
        try {
            let match = { agent_uuid: uuid, tenant_uuid };
            let groupByDetails = {
                _id: { campaign_uuid: "$campaign_uuid", agent_uuid: "$agent_uuid" },
                "login_status": { "$first": "$login_status" },
                "campaign_uuid": { "$first": "$campaign_uuid" }
            };
            let sort = { createdAt: -1 };
            let projection = { login_status: 1 };
            response = await this.commonDbFn.fetchDataByGroup(this.agent_campaign_login, match, "", groupByDetails, sort, "", projection);
            console.log("fetch campaign ", response)
            statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        } catch (error) {
            Logger.error(`Error in fetching campaigns for agent`, error.message);
        }
        return this.commonDbFn.sendResponseWithMessage(statusCode, response);
    }

    /*
    @Usage                        : To get logged in campaign details
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    // async getCampaignsForLoggedInAgent ( loggedInUserDetails ) {
    //     try {
    //         const { uuid, tenant_uuid, manager_uuid } = loggedInUserDetails;
    //         let match = { agent_uuid: uuid, tenant_uuid: manager_uuid == undefined ? tenant_uuid : manager_uuid };
    //         let response = await this.agent_campaign_report.aggregate( [
    //             { $match: match },
    //             {
    //                 $lookup: { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" }
    //             },
    //             {
    //                 $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" }
    //             },
    //             {
    //                 $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" }
    //             },
    //             { $sort: { _id: -1 } },
    //             {
    //                 $group: {
    //                     _id: "$campaign_uuid",
    //                     "outbound_campaign_details": { "$first": "$outbound_campaign.name" },
    //                     "login_status": { "$first": "$login_status" },
    //                     "inbound_campaign_details": { "$first": "$inbound_campaign.name" },
    //                     "dial_method": { "$first": "$outbound_campaign.dial_method" },
    //                     "campaign_type": { "$first": "$outbound_campaign.campaign_type" },
    //                     "recording": { "$first": "$outbound_campaign.recording" },
    //                     "current_dial_level": { "$first": "$outbound_campaign.concurrent_call" },
    //                     "target_drop_percent": { "$first": "$outbound_campaign.target_drop_percentage" },
    //                     "max_dial_level": { "$first": "$outbound_campaign.max_dial_level" },
    //                     "minimum_calls": { "$first": "$outbound_campaign.max_predictive_call_count" },
    //                     "number_masking": { "$first": "$outbound_campaign.number_masking" },
    //                     "blended_campaign_details": { "$first": "$blended_campaign.name" },
    //                     "blended_campaign_type": { "$first": "$blended_campaign.campaign_type" },
    //                     "blended_recording": { "$first": "$blended_campaign.recording" },
    //                     "inbound_recording": { "$first": "$inbound_campaign.recording" },
    //                     "blended_dial_method": { "$first": "$blended_campaign.dial_method" },
    //                     "blended_current_dial_level": { "$first": "$blended_campaign.concurrent_call" },
    //                     "blended_target_drop_percent": { "$first": "$blended_campaign.target_drop_percentage" },
    //                     "blended_max_dial_level": { "$first": "$blended_campaign.max_dial_level" },
    //                     "blended_minimum_calls": { "$first": "$blended_campaign.max_predictive_call_count" },
    //                     "blended_number_masking": { "$first": "$blended_campaign.number_masking" },
    //                     "wrap_up_time": { "$first": "$outbound_campaign.wrap_up_time" },
    //                     "wrap_up_disposition": { "$first": "$outbound_campaign.wrap_up_disposition" },
    //                     "inbound_wrap_up_time": { "$first": "$inbound_campaign.wrap_up_time" },
    //                     "inbound_wrap_up_disposition": { "$first": "$inbound_campaign.wrap_up_disposition" },
    //                     "blended_wrap_up_time": { "$first": "$blended_campaign.wrap_up_time" },
    //                     "blended_wrap_up_disposition": { "$first": "$blended_campaign.wrap_up_disposition" },
    //                 }
    //             },
    //             {
    //                 $project: { login_status: 1, inbound_campaign_details: 1, outbound_campaign_details: 1, dial_method: 1, campaign_type: 1, recording: 1, current_dial_level: 1, target_drop_percent: 1, max_dial_level: 1, minimum_calls: 1, number_masking: 1, blended_campaign_details: 1, blended_campaign_type: 1, blended_recording: 1, inbound_recording: 1, blended_dial_method: 1, blended_current_dial_level: 1, blended_target_drop_percent: 1, blended_max_dial_level: 1, blended_minimum_calls: 1, blended_number_masking: 1, wrap_up_time: 1, wrap_up_disposition: 1, blended_wrap_up_time: 1, blended_wrap_up_disposition: 1, inbound_wrap_up_time: 1, inbound_wrap_up_disposition: 1 }
    //             }
    //         ] );
    //         let obj = {}, finalArr = [], campaign_name, campaign_type, recording, dial_method, current_dial_level, target_drop_percent, max_dial_level, minimum_calls, number_masking, wrap_up_time, wrap_up_disposition;
    //         response?.map( ( data ) => {
    //             if ( data.login_status == "0" ) {
    //                 if ( data.outbound_campaign_details.length > 0 || data.inbound_campaign_details.length > 0 || data.blended_campaign_details.length > 0 ) {
    //                     campaign_name = data.outbound_campaign_details.length == 0 ? data.inbound_campaign_details[ 0 ] : data.outbound_campaign_details[ 0 ];
    //                     recording = data.outbound_campaign_details.length == 0 ? data.inbound_recording[ 0 ] : data.recording[ 0 ];
    //                     dial_method = data.outbound_campaign_details.length == 0 ? data.blended_dial_method[ 0 ] : data.dial_method[ 0 ];
    //                     current_dial_level = data.outbound_campaign_details.length == 0 ? data.blended_current_dial_level[ 0 ] : data.current_dial_level[ 0 ];
    //                     target_drop_percent = data.outbound_campaign_details.length == 0 ? data.blended_target_drop_percent[ 0 ] : data.target_drop_percent[ 0 ];
    //                     max_dial_level = data.outbound_campaign_details.length == 0 ? data.blended_max_dial_level : data.max_dial_level;
    //                     minimum_calls = data.outbound_campaign_details.length == 0 ? data.blended_minimum_calls[ 0 ] : data.minimum_calls[ 0 ];
    //                     number_masking = data.outbound_campaign_details.length == 0 ? data.blended_number_masking[ 0 ] : data.number_masking[ 0 ];
    //                     wrap_up_time = data.outbound_campaign_details.length == 0 ? data.inbound_wrap_up_time[ 0 ] : data.wrap_up_time[ 0 ];
    //                     wrap_up_disposition = data.outbound_campaign_details.length == 0 ? data.inbound_wrap_up_disposition[ 0 ] : data.wrap_up_disposition[ 0 ];

    //                     if ( data.outbound_campaign_details.length == 0 && data.inbound_campaign_details.length == 0 ) { // For Blended
    //                         campaign_name = data.blended_campaign_details[ 0 ];
    //                         campaign_type = data.blended_campaign_type[ 0 ];
    //                         recording = data.blended_recording[ 0 ];
    //                         wrap_up_time = data.blended_wrap_up_time[ 0 ];
    //                         wrap_up_disposition = data.blended_wrap_up_disposition[ 0 ];
    //                     } else {
    //                         campaign_type = data.campaign_type[ 0 ];
    //                     }

    //                     obj = { campaign_name, uuid: data._id, dial_method, campaign_type, recording, current_dial_level, target_drop_percent, max_dial_level, minimum_calls, number_masking, wrap_up_time, wrap_up_disposition };
    //                     finalArr.push( obj );
    //                 }
    //             }
    //         } )
    //         return finalArr.length == 0 ? this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, finalArr ) : this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, finalArr );
    //     } catch ( error ) {
    //         Logger.error( `Error in getting logged in campaign for agent`, error.essage );
    //         return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, error.message );
    //     }
    // }

    async getCampaignsForLoggedInAgent(loggedInUserDetails) {
        try {
            const { uuid, tenant_uuid, manager_uuid, campaign_uuid } = loggedInUserDetails;
            console.log("loggedInUserDetails", loggedInUserDetails);

            let match = { agent_uuid: uuid, tenant_uuid: manager_uuid == undefined ? tenant_uuid : manager_uuid };
            let response = await this.agent_campaign_report.aggregate([
                { $match: match },
                {
                    $lookup: { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" }
                },
                {
                    $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" }
                },
                {
                    $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" }
                },
                {
                    $lookup: { from: "call_queue", localField: "outbound_campaign.call_queue_uuid", foreignField: "uuid", as: "outbound_call_queue_details_raw" }
                },
                {
                    $lookup: { from: "call_queue", localField: "inbound_campaign.call_queue_uuid", foreignField: "uuid", as: "inbound_call_queue_details_raw" }
                },
                {
                    $lookup: { from: "call_queue", localField: "blended_campaign.call_queue_uuid", foreignField: "uuid", as: "blended_call_queue_details_raw" }
                },
                { $sort: { _id: -1 } },
                {
                    $group: {
                        _id: "$campaign_uuid",
                        "outbound_campaign_details": { "$first": "$outbound_campaign.name" },
                        "login_status": { "$first": "$login_status" },
                        "inbound_campaign_details": { "$first": "$inbound_campaign.name" },
                        "dial_method": { "$first": "$outbound_campaign.dial_method" },
                        "campaign_type": { "$first": "$outbound_campaign.campaign_type" },
                        "recording": { "$first": "$outbound_campaign.recording" },
                        "current_dial_level": { "$first": "$outbound_campaign.concurrent_call" },
                        "target_drop_percent": { "$first": "$outbound_campaign.target_drop_percentage" },
                        "max_dial_level": { "$first": "$outbound_campaign.max_dial_level" },
                        "minimum_calls": { "$first": "$outbound_campaign.max_predictive_call_count" },
                        "number_masking": { "$first": "$outbound_campaign.number_masking" },
                        "blended_campaign_details": { "$first": "$blended_campaign.name" },
                        "blended_campaign_type": { "$first": "$blended_campaign.campaign_type" },
                        "auto_answer": { "$first": "$blended_campaign.auto_answer" }, // new field
                        // "inbound_campaign_type": { "$first": "$inbound_campaign.campaign_type" },
                        "blended_recording": { "$first": "$blended_campaign.recording" },
                        "inbound_recording": { "$first": "$inbound_campaign.recording" },
                        "blended_dial_method": { "$first": "$blended_campaign.dial_method" },
                        "blended_current_dial_level": { "$first": "$blended_campaign.concurrent_call" },
                        "blended_target_drop_percent": { "$first": "$blended_campaign.target_drop_percentage" },
                        "blended_max_dial_level": { "$first": "$blended_campaign.max_dial_level" },
                        "blended_minimum_calls": { "$first": "$blended_campaign.max_predictive_call_count" },
                        "blended_number_masking": { "$first": "$blended_campaign.number_masking" },
                        "inbound_number_masking": { "$first": "$inbound_campaign.number_masking" },
                        "wrap_up_time": { "$first": "$outbound_campaign.wrap_up_time" },
                        "wrap_up_disposition": { "$first": "$outbound_campaign.wrap_up_disposition" },
                        "inbound_wrap_up_time": { "$first": "$inbound_campaign.wrap_up_time" },
                        "inbound_wrap_up_disposition": { "$first": "$inbound_campaign.wrap_up_disposition" },
                        "blended_wrap_up_time": { "$first": "$blended_campaign.wrap_up_time" },
                        "blended_wrap_up_disposition": { "$first": "$blended_campaign.wrap_up_disposition" },
                        "outbound_auto_answer": { "$first": "$outbound_campaign.auto_answer" },
                        "inbound_auto_answer": { "$first": "$inbound_campaign.auto_answer" },
                        "outbound_agent_script": { "$first": "$outbound_campaign.agent_script" },
                        "outbound_agent_script_text": { "$first": "$outbound_campaign.agent_script_text" },
                        "inbound_agent_script": { "$first": "$inbound_campaign.agent_script" },
                        "inbound_agent_script_text": { "$first": "$inbound_campaign.agent_script_text" },
                        "blended_agent_script": { "$first": "$blended_campaign.agent_script" },
                        "blended_agent_script_text": { "$first": "$blended_campaign.agent_script_text" },
                        "outbound_call_queue_details": { "$first": "$outbound_call_queue_details_raw" },
                        "inbound_call_queue_details": { "$first": "$inbound_call_queue_details_raw" },
                        "blended_call_queue_details": { "$first": "$blended_call_queue_details_raw" },
                    }
                },
                {
                    $project: { login_status: 1, inbound_campaign_details: 1, outbound_campaign_details: 1, dial_method: 1, campaign_type: 1, recording: 1, current_dial_level: 1, target_drop_percent: 1, max_dial_level: 1, minimum_calls: 1, number_masking: 1, blended_campaign_details: 1, blended_campaign_type: 1, blended_recording: 1, inbound_recording: 1, blended_dial_method: 1, blended_current_dial_level: 1, blended_target_drop_percent: 1, blended_max_dial_level: 1, blended_minimum_calls: 1, blended_number_masking: 1, inbound_number_masking: 1, wrap_up_time: 1, wrap_up_disposition: 1, blended_wrap_up_time: 1, blended_wrap_up_disposition: 1, inbound_wrap_up_time: 1, inbound_wrap_up_disposition: 1, auto_answer: 1, outbound_auto_answer: 1, inbound_auto_answer: 1, outbound_agent_script: 1, outbound_agent_script_text: 1, inbound_agent_script: 1, inbound_agent_script_text: 1, blended_agent_script: 1, blended_agent_script_text: 1, outbound_call_queue_details: 1, inbound_call_queue_details: 1, blended_call_queue_details: 1 }
                }
            ]);
            console.log("response lookup query ", response);
            console.log("response lookup query ", campaign_uuid);
            const resulttt = response.find((value) => value._id == campaign_uuid)
            console.log("res ponse lookup query  result", resulttt);
            const resultArray = resulttt ? [resulttt] : [];
            if (resulttt) {
                resulttt.login_status = "0"
            }


            let obj = {}, finalArr = [], campaign_name, campaign_type, recording, dial_method, current_dial_level, target_drop_percent, max_dial_level, minimum_calls, number_masking, wrap_up_time, wrap_up_disposition, auto_answer, agent_script, agent_script_text, call_queue_details;
            resultArray?.map((data) => {
                if (data.login_status == "0") {
                    if (data.outbound_campaign_details.length > 0 || data.inbound_campaign_details.length > 0 || data.blended_campaign_details.length > 0) {
                        campaign_name = data.outbound_campaign_details.length == 0 ? data.inbound_campaign_details[0] : data.outbound_campaign_details[0];
                        recording = data.outbound_campaign_details.length == 0 ? data.inbound_recording[0] : data.recording[0];
                        dial_method = data.outbound_campaign_details.length == 0 ? data.blended_dial_method[0] : data.dial_method[0];
                        current_dial_level = data.outbound_campaign_details.length == 0 ? data.blended_current_dial_level[0] : data.current_dial_level[0];
                        target_drop_percent = data.outbound_campaign_details.length == 0 ? data.blended_target_drop_percent[0] : data.target_drop_percent[0];
                        max_dial_level = data.outbound_campaign_details.length == 0 ? data.blended_max_dial_level : data.max_dial_level;
                        minimum_calls = data.outbound_campaign_details.length == 0 ? data.blended_minimum_calls[0] : data.minimum_calls[0];
                        number_masking = data.outbound_campaign_details.length == 0 ? data.blended_number_masking[0] : data.number_masking[0];
                        wrap_up_time = data.outbound_campaign_details.length == 0 ? data.inbound_wrap_up_time[0] : data.wrap_up_time[0];
                        wrap_up_disposition = data.outbound_campaign_details.length == 0 ? data.inbound_wrap_up_disposition[0] : data.wrap_up_disposition[0];
                        call_queue_details = data.outbound_campaign_details.length == 0 ? data.inbound_call_queue_details : data.outbound_call_queue_details;

                        if (data.inbound_campaign_details.length > 0) {
                            console.log("inside data.inbound_campaign_details.length");
                            number_masking = data.inbound_number_masking.length > 0 ? data.inbound_number_masking[0] : "1";
                            auto_answer = (data.inbound_auto_answer && data.inbound_auto_answer.length > 0) ? data.inbound_auto_answer[0] : "1";
                            agent_script = (data.inbound_agent_script && data.inbound_agent_script.length > 0) ? data.inbound_agent_script[0] : "1";
                            agent_script_text = (data.inbound_agent_script_text && data.inbound_agent_script_text.length > 0) ? data.inbound_agent_script_text[0] : "";
                            // campaign_type = data.inbound_campaign_type[ 0 ];
                            call_queue_details = data.inbound_call_queue_details;
                        }
                        if (data.outbound_campaign_details.length == 0 && data.inbound_campaign_details.length == 0) { // For Blended
                            campaign_name = data.blended_campaign_details[0];
                            campaign_type = data.blended_campaign_type[0];
                            recording = data.blended_recording[0];
                            wrap_up_time = data.blended_wrap_up_time[0];
                            wrap_up_disposition = data.blended_wrap_up_disposition[0];
                            auto_answer = data.auto_answer[0];
                            agent_script = data.blended_agent_script[0];
                            agent_script_text = data.blended_agent_script_text[0];
                            call_queue_details = data.blended_call_queue_details;
                        } else {
                            campaign_type = data.campaign_type[0];
                            if (data.outbound_campaign_details.length > 0) {
                                auto_answer = data.outbound_auto_answer[0];
                                agent_script = data.outbound_agent_script[0];
                                agent_script_text = data.outbound_agent_script_text[0];
                                call_queue_details = data.outbound_call_queue_details;
                            }
                        }

                        obj = { campaign_name, uuid: data._id, dial_method, campaign_type, recording, current_dial_level, target_drop_percent, max_dial_level, minimum_calls, number_masking, wrap_up_time, wrap_up_disposition, auto_answer, agent_script, agent_script_text, call_queue_details };
                        finalArr.push(obj);
                    }
                }
            })
            console.log("Finallllllllllllll", finalArr)
            return finalArr.length == 0 ? this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, finalArr) : this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, finalArr);
        } catch (error) {
            Logger.error(`Error in getting logged in campaign for agent`, error.essage);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, error.message);
        }
    }

    /******************************* Agent live report ****************************************/

    /*
    @Usage                        : To add agent details with campaign into agent_live_report
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async addAgentEntryInLiveReport(agentLiveReportDto: AgentLiveReportDto) {
        try {
            let logMessages = {
                logErrorMsg: `Agent already exist \n`,
                logSuccessMsg: `Agent entry added in live report \n`
            }
            const { uuid, tenant_uuid } = agentLiveReportDto;
            agentLiveReportDto.agent_uuid = uuid;
            let utCDate = new Date().toISOString();
            agentLiveReportDto.agent_logged_in_time = utCDate;
            let response = await this.commonDbFn.insert(this.agent_live_report, agentLiveReportDto, JSON.stringify(logMessages));

            if (response.statusCode == 201) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Agent added`)
            }

        } catch (error) {
            Logger.error(`Error in adding entry in live report`, error.message);
        }
    }

    /*
    @Usage                        : To update agent details with campaign into agent_live_report
    @Param  loggedInUserDetails   : LoggedIn user details
    @return Object                : Success / Error
    */

    async updateAgentEntryInLiveReport(updateAgentLiveReportDto: UpdateAgentLiveReportDto, loggedInUserInfo, campaign_uuid) {

        try {
            const { uuid, tenant_uuid } = loggedInUserInfo;
            //new
            updateAgentLiveReportDto.agent_uuid = uuid;
            let utCDate = new Date().toISOString();
            updateAgentLiveReportDto.agent_logged_in_time = utCDate;
            let { phone_number, status, campaign_type, campaign_name, type, campaign_uuid, extension_name, extension_uuid, agent_name, browserToken, agent_logged_in_time } = updateAgentLiveReportDto;

            if (campaign_uuid == "false") {
                campaign_name = "";
                phone_number = "";
            }

            let updateBody = {};
            // if(type == "hangup"){
            //  updateBody = { status, phone_number , campaign_type , campaign_name };
            // }else{
            //  updateBody = { status, phone_number, $inc: { total_calls: 1 } , campaign_type , campaign_name };
            // }
            if (type == "hangup") { delete updateBody["$inc"]; }
            if (phone_number == "") {
                delete updateBody["$inc"];
                let utCDate = new Date().toISOString();
                agent_logged_in_time = utCDate;
                // updateBody[ "agent_logged_in_time" ] = utCDate;
            }
            if (status == "1" || status == "2") {
                updateBody = { ...updateBody, $inc: { total_calls: 1 } };
            }
            updateBody = {
                ...updateBody, status, phone_number, campaign_type, campaign_name, extension_name, extension_uuid, agent_name, campaign_uuid, agent_logged_in_time
            };
            let response = await this.agent_live_report.updateOne({ agent_uuid: uuid, tenant_uuid }, updateBody, { upsert: true }).exec();
            //Add entry to calculate Idle and ACW in collection
            await this.addIdleACWEntryToDB(uuid, status, tenant_uuid);

            //Add extension details to outbound ring group section
            this.addExtensionDetailsToRinggroup(uuid, campaign_uuid, extension_name);

            //whatsapp
            if (updateBody["campaign_type"] == "2" && response.modifiedCount == 1) {
                await this.whatsapp_available_agent.deleteMany({ user_uuid: uuid, tenant_uuid: tenant_uuid }).exec();
                // Fetch the blended campaigns
                const blendedCampaign = await this.blended_campaign.find({ tenant_uuid: tenant_uuid, uuid: campaign_uuid }).exec();
                console.log(blendedCampaign);
                console.log("blendedCampaigns====");
                // Iterate over each blended campaign
                // for ( const blendedCampaign of blendedCampaigns ) {
                // Perform operations for each blended campaign
                if (blendedCampaign.length > 0) {
                    // const allowedMessagingQueue = blendedCampaign[0].allowed_messaging_queue.map((item: any) => item.uuid);
                    //  const allowedMessagingQueue = blendedCampaign[ 0 ].allowed_messaging_queue;
                    //  const uuids = allowedMessagingQueue.map((item: any) => item.uuid);
                    //working line
                    const allowedMessagingQueue = Array.isArray(blendedCampaign[0].allowed_messaging_queue) ?
                        blendedCampaign[0].allowed_messaging_queue.map((item: any) => item.uuid) : [];
                    //
                    console.log(allowedMessagingQueue);
                    console.log("====allowedMessagingQueue");
                    // const allowedMessagingQueue = blendedCampaign.allowed_messaging_queue;
                    const messagingQueue: any[] = await this.messaging_queue.find({ tenant_uuid: tenant_uuid, type: '0', uuid: { $in: allowedMessagingQueue } }).exec();
                    console.log(messagingQueue);
                    console.log("----messagingQueue---");
                    for (const queue of messagingQueue) {
                        const messaging_queue_channel = queue.messaging_queue_channel;
                        console.log(messaging_queue_channel);
                        console.log("====messaging_queue_channel");
                        if (messaging_queue_channel && messaging_queue_channel.WhatsApp) {
                            const whatsappChannels = messaging_queue_channel.WhatsApp;
                            console.log(whatsappChannels);
                            console.log("====WhatsApp Channels");
                            const messagingChannel: any = await this.messaging_channel.find({ tenant_uuid: tenant_uuid, type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
                            console.log(messagingChannel);
                            console.log("=====messagingChannel");
                            if (messagingChannel && messagingChannel.length > 0) {
                                for (const channel of messagingChannel) {
                                    // Fetch browser token from user table
                                    // const user = await this.user.findOne( { tenant_uuid: tenant_uuid, user_uuid: uuid } ).exec();
                                    // const browserToken = user.browserToken;
                                    const customFields = channel.customFields as { phone_number_id: string }; // Access the customFields object
                                    if (customFields) {
                                        const whatsappAvailableAgentData = [{
                                            phone_number_id: customFields.phone_number_id,
                                            tenant_uuid: tenant_uuid,
                                            user_uuid: uuid,
                                            browserToken: browserToken,
                                            type: 0 //call center
                                        }];
                                        console.log(whatsappAvailableAgentData);
                                        console.log("whatsappAvailableAgentData");
                                        // Insert data for whatsapp_available_agent
                                        await this.whatsapp_available_agent.insertMany(whatsappAvailableAgentData);
                                    }
                                    // Find and update the browserToken in whatsapp_sync collection
                                    const filter = {
                                        phone_number_id: customFields.phone_number_id,
                                        user_uuid: uuid,
                                        tenant_uuid: tenant_uuid,
                                        type: 0 //call center
                                    };
                                    const update = {
                                        $set: { browserToken: browserToken }
                                    };
                                    const result = await this.whatsapp_sync.updateMany(filter, update);
                                    console.log(result);
                                    console.log("whatsapp_sync updated");
                                    // await this.whatsapp_available_agent.deleteMany( { tenant_uuid, user_uuid: uuid, type: 0, browserToken } );
                                }
                            } else {
                                Logger.error(`WhatsApp messaging channel not found for the specified tenant and type`);
                            }
                        }
                    }
                }
            }
            //whatsapp
            if (response.modifiedCount > 0) {
                Logger.debug(`Agent status update successfully with combination of agent : ${uuid} and campaign : ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Agent update successfully`);
            } else if (response.upsertedCount > 0) {
                Logger.debug(`Agent added successfully in live report`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Agent added`);
            } else {
                Logger.error(`Unable to find combination of agent : ${uuid} and campaign : ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to find agent with campaign`);
            }
        } catch (error) {
            Logger.error(`Error in updating agent in live report`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to find agent with campaign`);
        }
    }

    /*
    @Usage         : Delete agent from live_report collection using uuid
    @Param uuid    : uuid of agent
    @return Object : Success / Error
    */

    async remove(uuid: string) {
        let response = await this.agent_live_report.deleteOne({ agent_uuid: uuid }).exec();
        if (response.deletedCount > 0) {
            Logger.debug(`Agent deleted from live report with uuid : ${uuid}`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Agent deleted successfully`);
        } else {
            Logger.debug(`Agent not exist in live report by uuid : ${uuid} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Agent not found`);
        }
    }


    /********************** Call queue list for agent portal *****************************/

    /*
    @Usage             : To fetch calls in queue[inbound campaign]
    @Param uuid        : uuid of inbound campaign
    @Param queryParams : LoggedInuser information
    @return Object     : Success / Error
    */

    async fetchCallQueueList(campaign_uuid: string, queryParams) {
        const { tenant_uuid, campaign_type } = queryParams;
        let statusCode = HttpStatus.NOT_FOUND, finalArray = [], obj = {};
        try {
            let response;
            if (campaign_type == "") {
                response = await this.inbound_campaign.findOne({ uuid: campaign_uuid, tenant_uuid }).exec();
            } else {
                response = await this.blended_campaign.findOne({ uuid: campaign_uuid, tenant_uuid }).exec();
            }
            if (response != null) {
                let callQueuesUUIDs: any = response?.call_queue_uuid;
                console.log("callQueuesUUIDscallQueuesUUIDs", callQueuesUUIDs)
                let result: any = await this.getCallQueues(callQueuesUUIDs);
                result = JSON.parse(result[0].result?.body);
                result = result.response;
                if (result.length > 0) {
                    result?.map((data) => {
                        if (data.state == "Trying" || data.state == "Waiting") {
                            obj = {
                                caller_id_name: data.cid_name,
                                caller_id: data.cid_number,
                                score: data.score
                            }
                            finalArray.push(obj);
                        }
                    });
                    statusCode = HttpStatus.OK;
                }
            } else {
                let collection = campaign_type == "" ? "inbound_campaign" : "blended_campaign";
                Logger.warn(`Queue not found from ${collection} with uuid : ${campaign_uuid}`);
            }
        } catch (error) {
            Logger.error(`Error in call queue`, error.message);
        }
        return this.commonDbFn.sendResponseWithMessage(statusCode, finalArray);
    }


    /*
    @Usage                 : To fetch calls in queue from freeswitch
    @Param callQueuesUUIDs : uuid of call queue
    @return Object         : Success / Error
    */

    async getCallQueues(callQueuesUUIDs) {
        let allData, finalArray = [], obj = {};
        let self = this;
        return new Promise(async function (resolve, reject) {
            allData = callQueuesUUIDs.map(async (data) => {
                obj = {
                    result: await self.commonFn.getCallsInQueue(data)
                }
                console.log("callQueuesUUIDscallQueuesUUIDs objj ", obj)
                finalArray.push(obj);
            });
            let result = await Promise.all(allData);
            resolve(finalArray);
        });
    }

    /*
    @Usage                 : To update lead_sent status
    @Param callQueuesUUIDs : uuid of call queue
    @return Object         : Success / Error
    */

    async updateLeadStatusToSent(updateLeadStatusSentDto: UpdateLeadStatusSentDto) {
        try {
            const { campaign_uuid, lead_management_uuid, tenant_uuid } = updateLeadStatusSentDto;
            let checkLeadExist = await this.leads_in_queue.find({ lead_management_uuid, campaign_uuid, tenant_uuid, lead_sent: "1" }).count().exec();
            if (checkLeadExist == 0) {
                //Current lead has been called by another agent
                Logger.debug(`Current lead has been called by another agent , sending new leads....`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Current lead has been called by another agent`);
            } else {
                let leadData = await this.leads_in_queue.updateOne({ lead_management_uuid, campaign_uuid, tenant_uuid }, { lead_sent: "0" }).exec();
                if (leadData.modifiedCount == 0 && leadData.modifiedCount == 0) {
                    Logger.error(`Unable to update data on where condition`);
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Successfully updated lead_sent status`);
                } else {
                    Logger.debug(`Successfully updated lead_sent status`);
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Successfully updated lead_sent status`);
                }
            }
        } catch (error) {
            Logger.error(`Unable to update lead_sent status`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Successfully updated lead_sent status`);
        }
    }


    /**************************** For Predective Mode *********************************/

    /*
    @Usage                 : To update new_dial_level based on matched condition
    @Param dialLevelDto    : Request dto
    @Param campaign_uuid   : uuid of campaign
    @return Object         : Success / Error
    */

    async updateDialLevel(campaign_uuid, campaign_flag) {
        //const { current_dial_level, target_drop_percent, max_dial_level, minimum_calls }: any = dialLevelDto;
        let response, result;
        try {

            if (campaign_flag == 'blended') {
                response = await this.blended_campaign.findOne({ uuid: campaign_uuid }, { max_predictive_call_count: 1, max_dial_level: 1, concurrent_call: 1, target_drop_percentage: 1 })
            } else if (campaign_flag == 'outbound') {
                response = await this.outbound_campaign.findOne({ uuid: campaign_uuid }, { max_predictive_call_count: 1, max_dial_level: 1, concurrent_call: 1, target_drop_percentage: 1 })
            }

            let current_dial_level = parseInt(response.concurrent_call);
            let target_drop_percent = response.target_drop_percentage;
            let max_dial_level = parseInt(response.max_dial_level);
            let minimum_calls = parseInt(response.max_predictive_call_count);

            response = await this.predictive_calculation.find({ campaign_uuid }, { flag: 1, _id: 0 }).exec();
            let totalCalls: any = 0, dropCalls: any = 0, failCalls: any = 0, newDialLevel;
            totalCalls = response.length;
            response?.map((data) => {
                dropCalls = data.flag == "1" ? dropCalls + 1 : dropCalls;
                failCalls = data.flag == "2" ? failCalls + 1 : failCalls;
            });

            failCalls = parseInt(failCalls);
            dropCalls = parseInt(dropCalls);

            console.log("Total Calls Count", response.length);
            console.log("Drop Calls Count", dropCalls);
            console.log("Minimum calls", minimum_calls);
            console.log("Current dial level", current_dial_level);
            console.log("Max dial level", max_dial_level);
            console.log("Target Drop %", target_drop_percent);
            console.log("Fail Call", failCalls);

            //Calculation of new dial level
            /*if(totalCalls == 0 || dropCalls == 0){
                    newDialLevel = current_dial_level;
                }else if (totalCalls == dropCalls) {
                    newDialLevel = max_dial_level;
                } else if (totalCalls == 0 || minimum_calls > totalCalls) {
                    newDialLevel = current_dial_level;
                } else {
                    let currentDropPercent: any = (dropCalls / totalCalls) * 100;
            console.log("currentDropPercent",currentDropPercent);
                    newDialLevel = current_dial_level;
            console.log("----",parseInt(currentDropPercent),parseInt(target_drop_percent))
                    if (parseInt(currentDropPercent) > parseInt(target_drop_percent)) {
                        newDialLevel = current_dial_level * currentDropPercent / 100;
                console.log("Inside IF with new dial level",newDialLevel);
                console.log("Substract current - new dial",(current_dial_level - newDialLevel));
                        newDialLevel = Math.ceil(current_dial_level - newDialLevel);
                console.log("Process End Found new dial level",newDialLevel);
                if(newDialLevel == 0){
                            newDialLevel = 1;
                        }
                    }
                }*/

            if (parseInt(totalCalls) == 0) {
                newDialLevel = current_dial_level;
                console.log("newDialLevel-1::", newDialLevel);
            } else if (totalCalls == dropCalls) {
                newDialLevel = max_dial_level;
                console.log("newDialLevel-2::", newDialLevel);
            } else if (minimum_calls > totalCalls) {
                newDialLevel = current_dial_level;
                console.log("newDialLevel-3::", newDialLevel);
            } else {
                let currentDropPercent: any = (dropCalls / totalCalls) * 100;
                let currentFailPercent: any = (failCalls / totalCalls) * 100;

                newDialLevel = current_dial_level;
                console.log("newDialLevel-4::", newDialLevel);

                if (parseInt(currentDropPercent) > parseInt(target_drop_percent) || parseInt(currentFailPercent) > parseInt(target_drop_percent)) {
                    if (failCalls > dropCalls) {
                        newDialLevel = Math.ceil(current_dial_level * currentFailPercent / 100);
                        newDialLevel = Math.ceil(current_dial_level + newDialLevel);
                        console.log("newDialLevel-5::", newDialLevel);
                    } else {
                        newDialLevel = Math.ceil(current_dial_level * currentDropPercent / 100);
                        newDialLevel = Math.ceil(current_dial_level - newDialLevel);
                        console.log("newDialLevel-6::", newDialLevel);
                    }
                }
            }

            if (parseInt(newDialLevel) <= 0) { newDialLevel = 1; console.log("newDialLevel-7::", newDialLevel); }
            if (parseInt(newDialLevel) > max_dial_level) { newDialLevel = max_dial_level; console.log("newDialLevel-8::", newDialLevel); }
            console.log("newDialLevel Final", newDialLevel);
            //Update dial level
            if (campaign_flag == "blended") {
                result = await this.blended_campaign.updateOne({ uuid: campaign_uuid }, { new_dial_level: newDialLevel, concurrent_call: newDialLevel }, { $upsert: true }).exec();
            } else if (campaign_flag == "outbound") {
                result = await this.outbound_campaign.updateOne({ uuid: campaign_uuid }, { new_dial_level: newDialLevel, concurrent_call: newDialLevel }, { $upsert: true }).exec();
            }
            if (result.modifiedCount > 0) {
                Logger.debug(`New dial level updated successfully with campaign: ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `New dial level updated successfully`);
            } else {
                Logger.error(`Unable to update dial level with campaign: ${campaign_uuid}`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to update dial level`);
            }
        } catch (error) {
            Logger.error(`Catch block ==== Error in updating dial level`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_IMPLEMENTED, `Unable to update dial level`);
        }
    }

    /*
    @Usage                      : To add/update data in lead report
    @Param lead_management_uuid : uuid of lead
    @return Object              : Success / Error
    */

    async addUpdateEntryInLeadReport(lead_management_uuid) {
        //Check data exist in lead_report
        try {
            let leadDetails = await this.lead_management.findOne({ lead_management_uuid }, { lead_group_uuid: 1, call_count: 1, lead_status: 1, _id: 0 }).exec();
            const { lead_group_uuid, lead_status, call_count } = leadDetails;
            let checkDataExistInLeadReport = await this.lead_report.findOne({ lead_group_uuid, disposition_uuid: lead_status, called_count: call_count }).exec();
            if (checkDataExistInLeadReport == null) {
                let insertData = {
                    lead_group_uuid,
                    disposition_uuid: lead_status,
                    called_count: call_count,
                    count: 1
                }
                const result = new this.lead_report(insertData);
                await result.save();
                Logger.debug(`New Record inserted in lead report`, JSON.stringify(result));
            } else {
                let response = await this.lead_report.updateOne({ uuid: checkDataExistInLeadReport.uuid }, { $inc: { count: 1 } }).exec();
                if (response.modifiedCount == 0) {
                    Logger.error(`Found same lead group,disposition,call count but unable to update count filed`);
                } else {
                    Logger.log(`Found same lead group,disposition,call count & successfully updated count filed`);
                }
            }
            if (lead_status != '' && lead_status != undefined) {
                console.log('adesh this is your code ')
                console.log(lead_status);
                let disposition_data = await this.disposition.findOne({ disposition_uuid: lead_status }).exec()
                console.log(disposition_data);
                if (
                    disposition_data.human_answer !== undefined &&
                    disposition_data.sale !== undefined) {
                    if (disposition_data.human_answer == '0' && disposition_data.sale == '0') {
                        let update_lead = await this.lead_group.updateOne(
                            { uuid: lead_group_uuid },
                            { $inc: { human_answer: 1, sale: 1 } }
                        ).exec();
                    } else if (disposition_data.human_answer == '0' && disposition_data.sale == '1') {
                        let update_lead = await this.lead_group.updateOne(
                            { uuid: lead_group_uuid },
                            { $inc: { human_answer: 1 } }
                        ).exec();
                    } else if (disposition_data.human_answer == '1' && disposition_data.sale == '0') {
                        let update_lead = await this.lead_group.updateOne(
                            { uuid: lead_group_uuid },
                            { $inc: { sale: 1 } }
                        ).exec();
                    }

                }
            }
        } catch (error) {
            Logger.error(`Error in catch block === patch() ==> lead_report`, error.message);
        }
    }

    /*
    @Usage               : To add data in DNC
    @Param phone_number  : phone number of lead
    @Param campaign_uuid : uuid of campaign
    @Param tenant_uuid   : uuid of tenant
    @return Object       : Success / Error
    */

    async addEntryInDNC(phone_number, campaign_uuid, tenant_uuid) {
        try {
            let insertData = {
                phone_number,
                campaign_uuid,
                tenant_uuid,
                global_status: "1",
                status: "0",
                concurrent_cam: ""
            }
            const result = new this.dnc(insertData);
            await result.save();
            Logger.debug(JSON.stringify(result), `Entry added in DNC`);
        } catch (error) {
            Logger.error(`Error in catch block === DNC`, error.message);
        }
    }


    /*
    @Usage               : To get caller ID
    @Param campaignData  : Campaign data
    @return boolean
    */

    /*async commonCodeToGetCallerID(campaignData) {
        let caller_id = await this.getCallerID(campaignData);
        this.storedCallerIDs.push(caller_id);

        let currentDateTime = new Date();
        let newDateAfterAddedMinutes = new Date(currentDateTime);
        newDateAfterAddedMinutes.setMinutes(currentDateTime.getMinutes() + parseInt(campaignData?.caller_id_time));
        this.storedDates.push({ end_date: newDateAfterAddedMinutes });
        return true;
    }*/

    async commonCodeToGetCallerID(campaignData, lead_number = "") {
        let caller_id;
        if (campaignData.call_id_type != "4") {
            if (this.storedCallerIDs.length == 0) {
                let caller_id = await this.getCallerID(campaignData, lead_number);
                this.storedCallerIDs.push(caller_id);

                let currentDateTime = new Date();
                let newDateAfterAddedMinutes = new Date(currentDateTime);
                newDateAfterAddedMinutes.setMinutes(currentDateTime.getMinutes() + parseInt(campaignData?.caller_id_time));
                this.storedDates.push({ end_date: newDateAfterAddedMinutes });
            }
            caller_id = this.storedCallerIDs[0];
            if (new Date() > this.storedDates[0].end_date) {
                Logger.warn(`Caller ID time ==> ${campaignData?.caller_id_time} minutes has been passed , sending new caller id \n`);
                this.storedCallerIDs = [];
                this.storedDates = [];
                await this.commonCodeToGetCallerID(campaignData, lead_number);
                caller_id = this.storedCallerIDs[0];
            }
        } else {
            caller_id = await this.getCallerID(campaignData, lead_number);
        }
        Logger.warn(caller_id, `Fetched CALLER ID ==>`);
        return caller_id;
    }

    /*
    @Usage               : To fetch leads
    @Param tenant_uuid   : uuid of tenant
    @Param campaign_uuid : uuid of campaign
    @return Object       : Success / Error
    */

    // async fetchLeads ( campaign_uuid, tenant_uuid, limit ) {
    //     try {
    //         let populateFields = [ { path: "lead_details", select: "first_name last_name phone_number lead_management_uuid uuid phone_code custom_phone_number -_id" } ];

    //         let allLeads = await this.leads_in_queue.find( { campaign_uuid, tenant_uuid, lead_sent: "1" }, { campaign_uuid: 1, lead_management_uuid: 1, tenant_uuid: 1, _id: 0 } ).limit( limit ).populate( populateFields ).exec();
    //         return allLeads;
    //     } catch ( error ) {
    //         Logger.error( `Error in catch block ==> fetchLeads()`, error.message );
    //     }
    // }

    async fetchLeads(campaign_uuid, tenant_uuid, limit, agentcount) {
        try {
            // Acquire the lock
            const maxLeads = agentcount * limit;
            console.log('maxleads =====>', maxLeads)
            const release = await mutex.acquire();
            console.log('THis api is lock');

            let populateFields = [
                { path: "lead_details", select: "first_name last_name phone_number lead_management_uuid uuid phone_code custom_phone_number -_id" }
            ];
            // let filter =  { campaign_uuid, tenant_uuid, lead_sent: "1" };
            let filter = {
                campaign_uuid, tenant_uuid, lead_sent: "1", $or: [
                    // Retry leads (time passed)
                    { resend_lead_time: { $lte: new Date() } },
                    // Fresh leads
                    { resend_lead_time: { $exists: false } },
                    { resend_lead_time: null }
                ]
            };
            // if (this.leadUUIDs.length > 0) {
            //     filter = { campaign_uuid, tenant_uuid, lead_sent: "1", lead_management_uuid: { $nin: this.leadUUIDs } };
            // } else {
            //     filter = { campaign_uuid, tenant_uuid, lead_sent: "1" };
            // }

            // Find and store the leads
            let newleads = await this.leads_in_queue.find(filter).populate(populateFields).limit(limit).exec();
            //  this.leadUUIDs = [];
            console.log(newleads);
            // Extract lead UUIDs from the retrieved leads
            //  this.leadUUIDs = allLeads.map( lead => lead.lead_management_uuid );
            // for (let lead of allLeads) {
            //     this.leadUUIDs.push(lead.lead_management_uuid);
            // }
            if (newleads.length > 0) {
                const newLeadUUIDs = newleads.map(lead => lead.lead_management_uuid);

                for (let lead of newleads) {
                    if (lead.lead_resent_count) {
                        this.leadUUIDs.push(lead.lead_management_uuid);
                    }
                }

                let updateResult = await this.leads_in_queue.updateMany({ lead_management_uuid: { $in: newLeadUUIDs } }, { $set: { lead_sent: "0" } });
                console.log(`Updated ${updateResult.modifiedCount} leads.`);

                // this.leadUUIDs.push(...newLeadUUIDs);
                while (this.leadUUIDs.length > maxLeads) {
                    console.log('going in while loop');
                    this.leadUUIDs.shift(); // Remove the oldest lead if the buffer exceeds the new max size
                }
            }

            console.log('lead_Array', this.leadUUIDs);
            // Update only the leads with the extracted lead UUIDs
            // let updateFilter = { lead_management_uuid: { $in: this.leadUUIDs } };
            // let update = { $set: { lead_sent: "0" } };

            // let updateResult = await this.leads_in_queue.updateMany( updateFilter, update );

            // console.log( `Updated ${updateResult.modifiedCount} leads.` );

            // Release the lock

            release();
            console.log('this api is unlock')

            return newleads; // Return the leads retrieved before updating
        } catch (error) {
            Logger.error(`Error in catch block ==> fetchLeads()`, error.message);
        }
    }


    /*
    @Usage               : To get agent status
    @Param tenant_uuid   : uuid of tenant
    @Param campaign_uuid : uuid of campaign
    @Param uuid          : uuid of agent
    @Param resumeDto     : Request Dto
    @return Object       : Success / Error
    */

    async getAgentStatus(campaign_uuid, uuid, tenant_uuid, resumeDto) {
        try {
            const { domain, username } = resumeDto;
            let result;
            let todayDateTime = this.commonFn.getTodayDate(true);
            result = await this.auto_campaign_originate.updateOne(
                { agent_uuid: uuid },   // ONLY this for uniqueness
                {
                    $set: {
                        campaign_uuid,
                        tenant_uuid,
                        domain,
                        username,
                        flag: "0"
                    }
                },
                { upsert: true }
            ).exec();
            // result = await this.auto_campaign_originate.updateOne({ agent_uuid: uuid, campaign_uuid, tenant_uuid, domain, username }, { flag: "0" }, { upsert: true }).exec();

            if (result.modifiedCount > 0) {
                Logger.debug(`Agent status set to 0 \n`);
            } else if (result.upsertedCount > 0) {
                Logger.debug(`Added agent into auto campaign originate \n`);
            } else {
                Logger.debug(`Unable to set agent status \n`);
            }

            //Get count of agent's in same campaign
            result = await this.auto_campaign_originate.find({ campaign_uuid, tenant_uuid, flag: 0 }).count().exec();
            return result;
        } catch (error) {
            Logger.error(`Error in catch block ==> getAgentDetails \n`, error.message);
        }
    }

    async getLiveCallsForTenant(returnCountOnly: any = "", resumeDto) {
        let liveCalls = 0, presenceData, loggedInUserUUID;
        let callsData = await this.parseXML("show calls as xml");

        // console.log( "------callsData-------" );
        // console.log( callsData );

        const callsDataString = JSON.stringify(callsData);
        // console.log( "------callsData as String-------" );
        // console.log( callsDataString );

        const parsedCallsData = JSON.parse(callsDataString);
        // console.log( "------parsedCallsData-------" );
        // console.log( parsedCallsData[ "result" ][ "row" ] );

        let data = parsedCallsData["result"]["row"];
        // let data = callsData[ "result" ][ "row" ];
        // console.log( data );
        // console.log( "------callsData-------" );
        if (data != undefined) {
            // console.log( "------if-------" );
            // console.log( data );
            data?.map(async (item, i) => {
                presenceData = item.presence_data[0].split(","); // tenant_uuid
                // console.log( "------presenceData-------" );
                // console.log( presenceData );
                loggedInUserUUID = presenceData[0] != undefined ? presenceData[0].split("=")[1] : "";
                // console.log( "------loggedInUserUUID-------" );
                // console.log( loggedInUserUUID );
                // console.log( resumeDto.tenant_uuid );
                // console.log( resumeDto.role );
                // console.log( resumeDto.role == "tenant" );
                if (resumeDto.tenant_uuid == loggedInUserUUID) {
                    liveCalls = liveCalls + 1;
                }
            });
        }

        if (returnCountOnly == "") return liveCalls;

        let liveCallArr = [];
        liveCallArr.push({ "live_calls": liveCalls });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, liveCallArr);

    }

    // async parseXML ( command ) {
    //     let conn, xml, self = this;
    //     const parser = new xml2js.Parser( { attrkey: "ATTR" } );
    //     return new Promise( async function ( resolve, reject ) {
    //         //conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
    //         conn = await self.commonFn.fetchFsConnection();
    //         conn.api( `${command}`, function ( res ) {
    //             xml = res.getBody();
    //             parser.parseString( xml, function ( err, result ) {
    //                 if ( err === null ) {
    //                     resolve( result );
    //                 } else {
    //                     reject( err );
    //                     console.log( err, "Error in live calls" );
    //                 }
    //             } )
    //         } )
    //         // })
    //     } );
    // }

    // async parseXML(command) {
    //     console.log("parseXML - command", command);
    //     let conn, xml, self = this;
    //     const parser = new xml2js.Parser({ attrkey: "ATTR" });
    //     return new Promise(async function (resolve, reject) {
    //         try {
    //             conn = await self.commonFn.fetchFsConnection();
    //             conn.api(`${command}`, function (res) {
    //                 xml = res.getBody().trim();
    //                 console.log('live call xml');
    //                 console.log(xml);

    //                 // Check if the XML is not found or empty
    //                 if ((xml.includes("+OK Job-UUID:") || xml.includes("-ERR Agent")) && !xml.trim().endsWith(">")) {
    //                     // Resolve with default XML response
    //                     resolve({ result: { ATTR: { row_count: "0" } } });
    //                 } else {
    //                     parser.parseString(xml, function (err, result) {
    //                         if (err === null) {
    //                             resolve(result);
    //                         } else {
    //                             console.log(err, "Error in live calls");
    //                             reject(err);
    //                         }
    //                     });
    //                 }
    //             });
    //         } catch (error) {
    //             console.log(error, "Error in connection or fetching data");
    //             reject(error);
    //         }
    //     });
    // }

    async parseXML(command) {
        console.log("parseXML - command", command);

        let conn, xml, self = this;
        const parser = new xml2js.Parser({ attrkey: "ATTR" });

        return new Promise(async function (resolve, reject) {
            try {
                conn = await self.commonFn.fetchFsConnection();

                conn.api(`${command}`, function (res) {
                    try {
                        xml = res.getBody()?.trim() || "";

                        console.log("live call xml");
                        console.log(xml);

                        // Handle empty response
                        if (!xml) {
                            return resolve({
                                result: { ATTR: { row_count: "0" } }
                            });
                        }

                        // Handle FreeSWITCH OK / ERR non-XML responses
                        if (
                            xml.startsWith("+OK") ||
                            xml.startsWith("-ERR")
                        ) {
                            console.log("Non XML FreeSWITCH response:", xml);

                            return resolve({
                                result: {
                                    ATTR: {
                                        row_count: "0"
                                    },
                                    message: xml
                                }
                            });
                        }

                        // Validate XML before parsing
                        if (!xml.startsWith("<")) {
                            console.log("Invalid XML response:", xml);

                            return resolve({
                                result: {
                                    ATTR: {
                                        row_count: "0"
                                    },
                                    message: "Invalid XML response"
                                }
                            });
                        }

                        // Parse XML
                        parser.parseString(xml, function (err, result) {
                            if (err) {
                                console.log(err, "Error in live calls");

                                return resolve({
                                    result: {
                                        ATTR: {
                                            row_count: "0"
                                        },
                                        message: "XML Parse Error"
                                    }
                                });
                            }

                            resolve(result);
                        });

                    } catch (innerError) {
                        console.log(innerError, "Inner parsing error");

                        resolve({
                            result: {
                                ATTR: {
                                    row_count: "0"
                                },
                                message: "Parsing exception"
                            }
                        });
                    }
                });

            } catch (error) {
                console.log(error, "Error in connection or fetching data");

                resolve({
                    result: {
                        ATTR: {
                            row_count: "0"
                        },
                        message: "Connection error"
                    }
                });
            }
        });
    }

    // Nirav 18-03-2025
    // async parseXML(command) {
    //     console.log("parseXML - command",command);
    //     let conn, xml, self = this;
    //     const parser = new xml2js.Parser({ attrkey: "ATTR" });

    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             // Fetch the connection and data
    //             conn = await self.commonFn.fetchFsConnection();
    //             conn.api(`${command}`, function (res) {
    //                 xml = res.getBody();
    //                 console.log('live call xml');
    //                 console.log(xml);

    //                 // Check if XML contains "+OK Job-UUID:" or "-ERR Agent" and not properly formed
    //                 if ((xml.includes("+OK Job-UUID:") || xml.includes("-ERR Agent")) && !xml.trim().endsWith(">")) {
    //                     // Resolve with default XML response if not found
    //                     resolve({ result: { ATTR: { row_count: "0" } } });
    //                 } else {
    //                     // Clean up the XML content
    //                     xml = xml.trim();

    //                     // Remove BOM (Byte Order Mark) if present
    //                     if (xml.charCodeAt(0) === 0xFEFF) {
    //                         xml = xml.slice(1);
    //                     }

    //                     // Ensure the XML starts with a valid tag
    //                     if (!xml.startsWith('<')) {
    //                         console.log("Invalid XML format detected.");
    //                         return reject(new Error('Invalid XML format'));
    //                     }

    //                     // Parse the XML string
    //                     parser.parseString(xml, function (err, result) {
    //                         if (err === null) {
    //                             resolve(result);
    //                         } else {
    //                             console.log(err, "Error in live calls");
    //                             reject(err);
    //                         }
    //                     });
    //                 }
    //             });
    //         } catch (error) {
    //             console.log(error, "Error in connection or fetching data");
    //             reject(error);
    //         }
    //     });
    // }


    /********************************* For Realtime Report ************************************/

    /*
    @Usage              : To add/update count based on tenant
    @Param tenant_uuid  : uuid of tenant
    @Param operation    : add/update
    @Param feature      : Inbound / Outbound
    @return Object      : Success / Error
    */

    async manageCallRinging(tenant_uuid, operation, feature) {
        try {
            let result;
            switch (feature) {
                case "inbound":
                    if (operation == "increment") {
                        result = await this.inbound_customer_ringing.updateOne({ tenant_uuid }, { $inc: { count: 1 } }, { upsert: true });
                    } else {
                        result = await this.inbound_customer_ringing.updateOne({ tenant_uuid }, { $inc: { count: -1 } }, { upsert: true });
                    }
                    break;
                case "outbound":
                    if (operation == "increment") {
                        result = await this.outbound_customer_ringing.updateOne({ tenant_uuid }, { $inc: { count: 1 } }, { upsert: true });
                    } else {
                        result = await this.outbound_customer_ringing.updateOne({ tenant_uuid }, { $inc: { count: -1 } }, { upsert: true });
                    }
                    break;
            }
            Logger.debug(`Count updated / added successfully`, JSON.stringify(result));
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Count added/updated successfully`);
        } catch (error) {
            Logger.error(`Error in catch block ===> manageCallRinging()`, error.message);
        }
    }

    /*
    @Usage               : To get agent status
    @Param agentUUID     : uuid of agent
    @Param status        : status
    @Param tenant_uuid   : uuid of tenant
    @return Object       : Success
    */

    async addIdleACWEntryToDB(agentUUID, status, tenant_uuid) {
        let todayDate = await this.commonFn.getTodayDate();
        let obj = { agent_uuid: agentUUID, status, tenant_uuid, date: todayDate };
        const result = new this.idle_state_agent(obj);
        await result.save();
        Logger.debug(`Entry added : ${JSON.stringify(obj)}`);
    }

    /*
    @Usage                       : To get campaign of agent of manager
    @Param assigned_manager_role : uuid of manager role
    @return Object               : Success
    */

    async getCampaignsForManagerAgent(assigned_manager_role, tenant_uuid, manager_uuid) {
        try {
            let allowedCampaignByTenant = await this.manager_role.findOne({ uuid: assigned_manager_role }, { role_name: 1, module_permission: 1, _id: 0 }).exec();
            let outboundUUIDs = allowedCampaignByTenant?.module_permission?.["outbound-campaign"]?.["outbound-campaign-uuids"] || [];
            let inboundUUIDs = allowedCampaignByTenant?.module_permission?.["inbound-campaign"]?.["inbound-campaign-uuids"] || [];
            let blendedUUIDs = allowedCampaignByTenant?.module_permission?.["blended-campaign"]?.["blended-campaign-uuids"] || [];
            let finalArray = {
                outbound_campaign: [],
                inbound_campaign: [],
                blended_campaign: []
            };
            finalArray["outbound_campaign"] = await this.outbound_campaign.find({ $or: [{ tenant_uuid: manager_uuid }, { uuid: { $in: outboundUUIDs } }] }).exec();
            finalArray["inbound_campaign"] = await this.inbound_campaign.find({ $or: [{ tenant_uuid: manager_uuid }, { uuid: { $in: inboundUUIDs } }] }).exec();
            finalArray["blended_campaign"] = await this.blended_campaign.find({ $or: [{ tenant_uuid: manager_uuid }, { uuid: { $in: blendedUUIDs } }] }).exec();
            ;
            return finalArray;
        } catch (error) {
            Logger.error(`Error in catch block ==> getCampaignsForManagerAgent()`, error.message);
            return {
                outbound_campaign: [],
                inbound_campaign: [],
                blended_campaign: []
            };
        }
    }


    /*
    @Usage                       : To add extension details into ring group
    @Param uuid                  : uuid of agent
    @Param campaign_uuid         : uuid of campaign
    @Param extension_name        : name of extension
    @return Object               : Success / Error
    */

    async addExtensionDetailsToRinggroup(uuid, campaign_uuid, extension) {
        try {
            //Fetch all ring group that belong to campaign_uuid
            let result: any = await this.outbound_campaign.find({ uuid: campaign_uuid }, { _id: 0, ring_group_uuid: 1 }).exec();
            if (result.length) {
                let ringGroupData = result[0].ring_group_uuid;
                let obj = { extension_type: "0", extension, user_uuid: uuid };

                ringGroupData.map(async (data) => {
                    await this.ring_group.updateOne({ uuid: data, 'extension_list.user_uuid': { $ne: data } }, { $addToSet: { extension_list: obj } }).exec();
                })
            } else {
                Logger.warn(`No ringgroup found to update extension details`);
            }
        } catch (error) {
            Logger.error(`Error in catch block ==> addExtensionDetailsToRinggroup()`, error.message);
        }
    }


    /*
   @Usage                 : To get call waiting for agent
   @Param collection_name : agent_live_report
   @Param uuid            : Agent UUID
   @Param logMessage      : Object with error & success response and message
   @return Object         : Result of call waiting for outbound and inbound
   */

    async fetchAgentCallWaiting(queryParams: any) {
        // console.log( "fetchAgentCallWaiting - queryParams ==> ", queryParams );
        try {
            //  Variable declaration
            let objData: any, finalArray: any = {}, checkRole: any = {}, result: any = {}, agentWaiting: any = 0, callAgentWaiting: any = 0;

            //  Search fields
            // let searchFields = [ "agent_name", "campaign_name", "extension_name", "phone_number" ];


            //  Check Role type
            let { role, tenant_uuid, parent_uuid } = queryParams;
            // console.log( "fetchAgentCallWaiting - role ==> ", role );
            // console.log( "fetchAgentCallWaiting - tenant_uuid ==> ", tenant_uuid );
            // console.log( "fetchAgentCallWaiting - parent_uuid ==> ", parent_uuid );

            // //  Check role
            // if ( role == "tenant" || role == "manager" || role == "agent" ) {
            //     checkRole = {
            //         tenant_uuid, status: { $ne: "6" }, agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' }
            //     };
            // }
            // console.log( "fetchAgentCallWaiting - checkRole ==> ", checkRole );

            // //  Get result
            // result = await this.agent_live_report.aggregate( [
            //     {
            //         $match: {
            //             $or: [
            //                 {
            //                     $and: [
            //                         { tenant_uuid: ( parent_uuid ) ? parent_uuid : tenant_uuid },
            //                         { status: { $ne: "6" } },
            //                         { agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }
            //                     ]
            //                 },
            //                 {
            //                     $and: [ checkRole ]
            //                 }
            //             ]
            //         }
            //     }
            // ] );
            // // console.log( "fetchAgentCallWaiting - result ==> ", result );

            // //  Get final result
            // result?.map( ( data: any ) => {
            //     //  Agent call waiting
            //     agentWaiting = ( ( data?.campaign_type == "1" || data?.campaign_type == "2" ) && data?.status != "4" ) ? agentWaiting + 1 : agentWaiting;
            // } );
            // console.log( "fetchAgentCallWaiting - agentWaiting ==> ", agentWaiting );


            //  Get outbound count of waiting and ringing
            let outboundCountsNew: any = await this.getOutboundCount(tenant_uuid, queryParams);
            // console.log( "fetchAgentCallWaiting - outboundCountsNew ==> ", outboundCountsNew );

            //  Get inbound count of waiting and ringing
            let inboundCountsNew: any = await this.getInboundCount(tenant_uuid, queryParams);
            // console.log( "fetchAgentCallWaiting - inboundCountsNew ==> ", inboundCountsNew );

            // objData = { agentWaiting, agentOnCall: ( outboundCountsNew.agentOnCall + inboundCountsNew.agentOnCall ), callAgentWaiting: { inboundCount: inboundCountsNew?.waitingInbound, outboundCount: outboundCountsNew.waitingOutbound }, callAgentRinging: { inboundCount: inboundCountsNew?.ringingInbound, outboundCount: outboundCountsNew.ringingOutbound } };
            // objData.activeCalls = inboundCountsNew?.waitingInbound + outboundCountsNew?.waitingOutbound + ( outboundCountsNew.agentOnCall + inboundCountsNew.agentOnCall ) + inboundCountsNew?.ringingInbound + outboundCountsNew?.ringingOutbound;

            objData = { callAgentWaiting: { inboundCount: inboundCountsNew?.waitingInbound, outboundCount: outboundCountsNew.waitingOutbound } };


            finalArray["agent_call_data"] = objData;
            // console.log( "fetchAgentCallWaiting - finalArray ==> ", finalArray );

            return {
                statusCode: HttpStatus.OK,
                agentCallData: finalArray.agent_call_data
            }
        } catch (error) {
            Logger.error(`CATCH FOUND - fetchAgentCallWaiting ==> `, error.message);

            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                agentCallData: ""
            }
        }
    }

    /*
    @Usage                 : To get outbound calls
    @Param collection_name : tenant_uuid, queryParams
    @Param uuid            : tenant_uuid
    @Param logMessage      : Object with error & success response and message
    @return Object         : Result of call waiting for outbound count
    */

    async getOutboundCount(tenant_uuid: any, queryParams: any) {
        const { parent_uuid, role } = queryParams;
        let match = {}, groupByDetails, result, lookupDetails, agentOnCall = 0, ringingOutbound = 0, waitingOutbound = 0, finalArray = [];
        //match = { tenant_uuid };
        //match = role == "tenant" ? { tenant_uuid } : { $or:[{tenant_uuid:parent_uuid},{tenant_uuid}] };
        match = role == "tenant" ? { tenant_uuid } : { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
        groupByDetails = {
            _id: {
                tenant_uuid: "$tenant_uuid",
                type: "$type",
            },
            count: { $sum: 1 }
        }

        try {
            result = await this.commonDbFn.fetchDataByGroup(this.realtime_report_count_management, match, "", groupByDetails, "", "", "");
            if (result.length > 0) {
                result.map((data) => {
                    finalArray = [];
                    ringingOutbound = data._id.type == 0 ? (ringingOutbound + data.count) : ringingOutbound;
                    waitingOutbound = data._id.type == 1 ? (waitingOutbound + data.count) : waitingOutbound;
                    agentOnCall = data._id.type == 2 ? (agentOnCall + data.count) : agentOnCall;
                });
                finalArray.push({ ringingOutbound, waitingOutbound, agentOnCall });
            } else {
                finalArray.push({ ringingOutbound, waitingOutbound, agentOnCall });
            }
            return finalArray[0];
        } catch (error) {
            Logger.error(`Error in catch block ==> getOutboundCount()`, error.message);
        }
    }

    /*
    @Usage                 : To get inbound calls
    @Param collection_name : tenant_uuid, queryParams
    @Param uuid            : tenant_uuid
    @Param logMessage      : Object with error & success response and message
    @return Object         : Result of call waiting for inbound count
    */

    async getInboundCount(tenant_uuid: any, queryParams: any) {
        let match = {}, groupByDetails, result, agentOnCall = 0, ringingInbound = 0, waitingInbound = 0, finalArray = [];
        //match = { tenant_uuid };
        const { parent_uuid, role } = queryParams;
        match = role == "tenant" ? { tenant_uuid } : { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
        groupByDetails = {
            _id: {
                tenant_uuid: "$tenant_uuid",
                type: "$type",
            },
            count: { $sum: 1 }
        }

        try {
            result = await this.commonDbFn.fetchDataByGroup(this.realtime_report_inbound_count_management, match, "", groupByDetails, "", "", { count: 1 });
            if (result.length > 0) {
                result.map((data) => {
                    ringingInbound = data._id.type == 0 ? (ringingInbound + data.count) : ringingInbound;
                    waitingInbound = data._id.type == 1 ? (waitingInbound + data.count) : waitingInbound;
                    agentOnCall = data._id.type == 2 ? (agentOnCall + data.count) : agentOnCall;
                });
                finalArray.push({ ringingInbound, waitingInbound, agentOnCall });
            } else {
                finalArray.push({ ringingInbound, waitingInbound, agentOnCall });
            }
            return finalArray[0];
        } catch (error) {
            Logger.error(`Error in catch block ==> getInboundCount()`, error.message);
        }
    }

    async fetchcallwaitingcount(queryParams) {
        console.log(queryParams);
        const { tenant_uuid } = queryParams;
        console.log(tenant_uuid);

        let outbound_count = 0, inbound_count = 0;

        outbound_count = await this.realtime_report_count_management.count({ tenant_uuid: tenant_uuid, type: 1 }).exec();

        console.log('outbound count ========>', outbound_count);

        inbound_count = await this.realtime_report_inbound_count_management.count({ tenant_uuid: tenant_uuid, type: 1 }).exec();


        console.log('inbound count =============>', inbound_count);

        let finalarray = [];
        finalarray.push({ outbound_count, inbound_count });

        return finalarray[0];

    }

    async addblacklistentry(createInboundBlockCampaignAgentDto: CreateInboundBlockCampaignAgentDto, userinfo) {



        const { tenant_uuid, type_value } = createInboundBlockCampaignAgentDto;


        let where = [{ tenant_uuid }, { type_value }];
        let logMessages = {
            logErrorMsg: "Block inbound campaign already exist \n",
            logSuccessMsg: "Block inbound campaign created successfully \n"
        }
        createInboundBlockCampaignAgentDto.name = 'agent block';
        createInboundBlockCampaignAgentDto.type = '1';
        createInboundBlockCampaignAgentDto.status = '0';
        createInboundBlockCampaignAgentDto.user_uuid = userinfo.uuid;



        return this.commonDbFn.findAndInsert(this.block_inbound_campaign, where, createInboundBlockCampaignAgentDto, JSON.stringify(logMessages), "and");
    }

    async sendwebformdata(sendwebformdata) {
        const { tenant_uuid, webform_uuid, lead_uuid } = sendwebformdata;
        // console.log( tenant_uuid );
        // console.log( webform_uuid );
        // console.log( lead_uuid );

        let webformdata = await this.webform.findOne({ uuid: webform_uuid }).exec();

        // console.log( webformdata );

        let leaddata = await this.lead_management.findOne({ lead_management_uuid: lead_uuid }).lean().exec();

        // console.log( leaddata );

        const updatedUrl = await this.replacePlaceholders(webformdata.url, leaddata);
        console.log('Updated URL:', updatedUrl);

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, updatedUrl)

    }

    async replacePlaceholders(url, data) {
        // console.log( "Data received in replacePlaceholders:", data );
        const regex = /#(\w+)#/g;
        return url.replace(regex, (match, keyWithHash) => {
            const key = keyWithHash.replace(/#/g, '');
            // console.log( "Matching key:", key );
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                // console.log( "Replacement value:", data[ key ] );
                return data[key];
            } else {
                // console.log( "Key not found, returning original match:", match );
                return match;
            }
        });
    }

    // async endchat(archievewhatsappmessagedto: ArchieveWhatsappMessaggeDto) {
    //     try {
    //         console.log(archievewhatsappmessagedto);
    //         const { tenant_uuid, uuid, from_number, phone_number_id, type } = archievewhatsappmessagedto;
    //         archievewhatsappmessagedto.user_uuid = uuid;
    //         archievewhatsappmessagedto.uuid = randomUUID();
    //         archievewhatsappmessagedto.type = type;

    //         let whatsappmessage_data = await this.whatsappmessage.find({ phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec();
    //         archievewhatsappmessagedto.message_json = whatsappmessage_data;


    //         const result = new this.archievewhatsappmessage(archievewhatsappmessagedto);
    //         await result.save();
    //         await this.whatsappmessage.deleteMany({ phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec()
    //         await this.whatsapp_sync.deleteMany({ phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec()
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, 'End Chat Successfully')
    //     } catch (error) {
    //         Logger.error(`Error in catch block === Archivewhatsappmessage`, error.message);
    //     }
    // }

    async transferchat(transferdata) {
        try {
            console.log(transferdata);
            const { phone_number_id, from_number, user_uuid, uuid } = transferdata;
            if (phone_number_id != '' && from_number != "" && user_uuid != "") {
                let transferchat_user = await this.user.findOne({ uuid: uuid }).exec();
                console.log(transferchat_user);
                const { username } = transferchat_user;
                await this.whatsappmessage.updateMany({ phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }, { $set: { user_uuid: user_uuid, transfer_uuid: uuid, transfer_username: username } }).exec();
                await this.whatsapp_sync.updateMany({ phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }, { $set: { user_uuid: user_uuid, transfer_uuid: uuid, transfer_username: username } }).exec();
                // let transferchat_user = await this.user.find( { uuid: uuid } ).exec();
                // return transferchat_user;
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, 'Chat Transfer Successfully')
            } else {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Phone_number_id/from_number/user_uuid something is empty`);
            }


        } catch (error) {
            Logger.error(`Error in catch block === Archivewhatsappmessage`, error.message);
        }
    }

    // async fetchpreviouschat(queryParams) {
    //     try {
    //         console.log(queryParams);
    //         const { from_number } = queryParams;
    //         if (from_number != "") {
    //             // Define the filter
    //             let filter = { from_number };
    //             // Define the aggregation pipeline
    //             let response = await this.archievewhatsappmessage.aggregate([
    //                 { $match: filter },
    //                 // { $sort: { _id: -1 } },x
    //                 {
    //                     $lookup: {
    //                         from: 'user', // Replace with your actual user collection name
    //                         localField: 'user_uuid',
    //                         foreignField: 'uuid',
    //                         as: 'userDetails'
    //                     }
    //                 },
    //                 {
    //                     $group: {
    //                         _id: "$user_uuid",
    //                         agent: { $push: "$$ROOT" }
    //                     }
    //                 },
    //                 {
    //                     $project: {
    //                         id: 1,
    //                         agent: 1,
    //                     }
    //                 },
    //             ]).exec();
    //             return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, response);
    //         } else {
    //             return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Phone_number_id/from_number/user_uuid something is empty`);
    //         }
    //     } catch (error) {
    //         Logger.error(`Error in catch block === Archivewhatsappmessage`, error.message);
    //     }
    // }


    async logoutallcallqueue(queryParams) {
        console.log(queryParams)
        const { uuid, tenant_uuid, username, domain } = queryParams
        let callQueueUUIDs: string[] = [];

        let login_campaigns = await this.agent_campaign_login.find({ agent_uuid: uuid, tenant_uuid: tenant_uuid, login_status: "0" }).select("campaign_uuid").exec();
        console.log(login_campaigns);

        // const campaignUUIDs = login_campaigns.map(campaign => campaign.campaign_uuid);
        // console.log(campaignUUIDs)

        if (login_campaigns.length > 0) {
            for (let i = 0; i < login_campaigns.length; i++) {
                let campaign_uuid = login_campaigns[i].campaign_uuid;
                console.log(`Processing campaign_uuid: ${campaign_uuid}`);

                let outbound_campaign_data = await this.outbound_campaign.findOne({ uuid: campaign_uuid }).select("call_queue_uuid").exec();
                let inbound_campaign_data = await this.inbound_campaign.findOne({ uuid: campaign_uuid }).select("call_queue_uuid").exec();
                let blended_campaign_data = await this.blended_campaign.findOne({ uuid: campaign_uuid }).select("call_queue_uuid").exec();

                if (outbound_campaign_data && Array.isArray(outbound_campaign_data.call_queue_uuid) && outbound_campaign_data.call_queue_uuid.length > 0) {
                    console.log("Outbound campaign data:", outbound_campaign_data);
                    callQueueUUIDs.push(...outbound_campaign_data.call_queue_uuid);
                }

                if (inbound_campaign_data && Array.isArray(inbound_campaign_data.call_queue_uuid) && inbound_campaign_data.call_queue_uuid.length > 0) {
                    console.log("Inbound campaign data:", inbound_campaign_data);
                    callQueueUUIDs.push(...inbound_campaign_data.call_queue_uuid);
                }

                if (blended_campaign_data && Array.isArray(blended_campaign_data.call_queue_uuid) && blended_campaign_data.call_queue_uuid.length > 0) {
                    console.log("Blended campaign data:", blended_campaign_data);
                    callQueueUUIDs.push(...blended_campaign_data.call_queue_uuid);
                }
            }
            callQueueUUIDs = [...new Set(callQueueUUIDs)];
            console.log("All collected call_queue_uuid values:", callQueueUUIDs);
            if (callQueueUUIDs.length > 0) {
                for (let j = 0; j < callQueueUUIDs.length; j++) {
                    let call_queue_uuid = callQueueUUIDs[j];
                    console.log(call_queue_uuid);

                    await this.commonFn.addUpdateAgentInQueue(username, domain, "", "", "", "logout", call_queue_uuid);
                }
            }
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "All Call-Queue Logout successfully");
    }

    // async updatedefaultmessagingchannel(updatedata) {
    //     console.log(updatedata);
    //     const { uuid, type, messaging_channel_uuid } = updatedata;
    //     if (type == "WhatsApp") {
    //         await this.user.updateOne({ uuid: uuid }, { $set: { whatsapp_messaging_channel_uuid: messaging_channel_uuid } }).exec()
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, 'Messaging channel updated Successfully')
    //     }
    //     // else if (type == "SMS") {
    //     //     await this.user.updateOne({uuid:uuid},{$set:{sms_messaging_channel_uuid:messaging_channel_uuid}}).exec()
    //     //     return this.commonDbFn.sendResponseWithMessage( HttpStatus.CREATED, 'Messaging channel updated Successfully' )
    //     // }
    //     else {
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, 'type is not found')
    //     }

    // }

    async updatedefaultmessagingchannel(updatedata) {
        console.log(updatedata);

        const { uuid, messaging_channel_uuid } = updatedata;

        if (
            !uuid ||
            !messaging_channel_uuid?.value ||
            !messaging_channel_uuid?.label
        ) {
            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.BAD_REQUEST,
                'uuid, messaging_channel_uuid.value and messaging_channel_uuid.label are required'
            );
        }

        await this.user.updateOne(
            {
                uuid,
                'omni_messaging_channel_uuid.value': {
                    $ne: messaging_channel_uuid.value,
                },
            },
            {
                $push: {
                    omni_messaging_channel_uuid: {
                        value: messaging_channel_uuid.value,
                        label: messaging_channel_uuid.label,
                    },
                },
            }
        ).exec();

        return this.commonDbFn.sendResponseWithMessage(
            HttpStatus.CREATED,
            'Messaging channel updated successfully'
        );
    }



    async agentTenantLogout(userId, data) {
        const { entity } = data;
        await this.user.updateOne({ uuid: userId }, { is_logged_in: "1" }).exec()
        await this.agent_live_report.updateOne({ agent_uuid: userId }, { status: "6", phone_number: "" }).exec()

        if (entity == "tenant") {
            this.socketService.adminLogout(userId, data)
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, 'Tenant Logged Out Successfully')
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, 'Agent Logged Out Successfully')
    }

    async loginPageLogout(data) {
        const { username, domain } = data;
        const tenant_detail = await this.tenant.findOne({ domain }).exec();
        console.log("tenanntt dateeausdbas", tenant_detail);
        if (!tenant_detail) return { statusCode: 400, data: "Invalid Domain !!!" };
        if (!username) return { statusCode: 400, data: "Invalid Username !!!" };

        const userDetails: any = await this.user.findOne({ username }).exec();
        // console.log("userDetailsuserDetails",userDetails);
        await this.user.updateOne({ username, tenant_uuid: tenant_detail?.uuid }, { is_logged_in: "1" }).exec()
        await this.agent_live_report.updateOne({ agent_name: username }, { status: "6", phone_number: "" }).exec()
        if (userDetails) {
            this.socketService.adminLogout(userDetails?.uuid, data)
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, 'Agent Logged Out from Login Page Successfully')
    }

    async forceLoginRole(data) {
        const { username, domain } = data;
        const tenant_detail = await this.tenant.findOne({ domain }).exec();
        console.log("tenanntt dateeausdbas", tenant_detail);
        if (!tenant_detail) return { statusCode: 400, data: "Invalid Domain !!!" };
        if (!username) return { statusCode: 400, data: "Invalid Username !!!" };
        const tenantUuid =
            tenant_detail?.tenant_uuid ||
            tenant_detail?.uuid ||
            tenant_detail?._id?.toString();
        if (!tenantUuid) {
            return { statusCode: 500, data: "Tenant UUID not found in tenant record" };
        }
        // 3) Find current user under that tenant_uuid
        const user = await this.user
            .findOne({ username, tenant_uuid: tenantUuid })
            .select("username tenant_uuid user_role_uuid user_group_uuid uuid")
            .exec();

        if (!user) return { statusCode: 404, data: "User not found !!!" };

        // 4) Fetch role using user_role_uuid (because forceLogin is NOT in user table)
        let roleDoc = null;
        if (user?.user_role_uuid) {
            roleDoc = await this.user_role
                .findOne({ uuid: user.user_role_uuid })
                .select("uuid name role_name forceLogin force_login forcelogin")
                .exec();
            console.log(roleDoc, 'roleDoc');

        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, 'Agent Role provided Successfully', {
            username: user.username,
            domain: domain,
            force_login: roleDoc?.force_login,
        })
    }
    async bulkAgentLogout(userIds: string[]) {
        // Logout users
        await this.user.updateMany(
            { uuid: { $in: userIds } },
            { $set: { is_logged_in: "1" } }
        ).exec();

        // Update agent live reports
        await this.agent_live_report.updateMany(
            { agent_uuid: { $in: userIds } },
            { $set: { status: "6", phone_number: "" } }
        ).exec();

        return this.commonDbFn.sendResponseWithMessage(
            HttpStatus.OK,
            'Agent Logged Out Successfully'
        );
    }

    // omnichannel
    async fetchpreviousomnichannelchat(queryParams) {
        try {
            console.log(queryParams, "queryParams prev omni channel history");
            const { from_number, channel_type } = queryParams;
            if (from_number != "") {
                // Define the filter
                let filter = { from_number };
                // Define the aggregation pipeline
                let response = await this.archieveomnichannelmessage.aggregate([
                    { $match: filter },
                    // { $sort: { _id: -1 } },
                    {
                        $lookup: {
                            from: 'user', // Replace with your actual user collection name
                            localField: 'user_uuid',
                            foreignField: 'uuid',
                            as: 'userDetails'
                        }
                    },
                    {
                        $group: {
                            _id: "$user_uuid",
                            agent: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            id: 1,
                            agent: 1,
                        }
                    },
                ]).exec();
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, response);
            } else {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Phone_number_id/from_number/user_uuid something is empty`);
            }
        } catch (error) {
            Logger.error(`Error in catch block === Archivewhatsappmessage`, error.message);
        }
    }

    // async omnichannelendchat(archieveomnimessagedto: ArchieveOmniMessaggeDto) {
    //     // async omnichannelendchat ( archievewhatsappmessagedto: ArchieveWhatsappMessaggeDto ) {
    //     try {
    //         console.log(archieveomnimessagedto, "end chat of omni dto");
    //         const { tenant_uuid, uuid, from_number, phone_number_id, type, channel_type, channel_identifiers } = archieveomnimessagedto;
    //         const { facebook_page_id, instagram_business_account_id } = channel_identifiers;
    //         archieveomnimessagedto.user_uuid = uuid;
    //         archieveomnimessagedto.uuid = randomUUID();
    //         archieveomnimessagedto.type = type;
    //         archieveomnimessagedto.channel_type = channel_type;
    //         archieveomnimessagedto.channel_identifiers = channel_identifiers;

    //         let whatsappmessage_data = await this.omnichannelMessage.find({
    //             user_uuid: uuid, $and: [
    //                 {
    //                     $or: [
    //                         { "channel_identifiers.phone_number_id": phone_number_id },
    //                         { "channel_identifiers.facebook_page_id": facebook_page_id },
    //                         { "channel_identifiers.instagram_business_account_id": instagram_business_account_id }
    //                     ]
    //                 },
    //                 {
    //                     $or: [
    //                         { from_number: from_number },
    //                         { to: from_number }
    //                     ]
    //                 }
    //             ]
    //         }).exec();
    //         // let whatsappmessage_data = await this.omnichannelMessage.find({ "channel_identifiers.phone_number_id": phone_number_id, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec();
    //         archieveomnimessagedto.message_json = whatsappmessage_data;


    //         const result = new this.archieveomnichannelmessage(archieveomnimessagedto);
    //         await result.save();
    //         // "channel_identifiers.phone_number_id":  phone_number_id ,
    //         // 
    //         await this.omnichannelMessage.deleteMany({ "channel_identifiers.phone_number_id": phone_number_id, channel_type, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec()
    //         await this.omnichannelSync.deleteMany({ "channel_identifiers.phone_number_id": phone_number_id, channel_type, user_uuid: uuid, $or: [{ from_number: from_number }, { to: from_number }] }).exec()
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, 'End Chat Successfully')
    //     } catch (error) {
    //         Logger.error(`Error in catch block === Archivewhatsappmessage`, error.message);
    //     }

    // }

    async omnichannelendchat(
        archieveomnimessagedto: ArchieveOmniMessaggeDto
    ) {
        try {
            console.log(archieveomnimessagedto, "end chat of omni dto");

            const {
                tenant_uuid,
                uuid,
                from_number,
                // phone_number_id,
                type,
                channel_type,
                channel_identifiers
            } = archieveomnimessagedto;

            const {
                facebook_page_id,
                instagram_business_account_id,
                phone_number_id
            } = channel_identifiers || {};

            /* --------------------------------------------------
               Build dynamic channel identifier condition
            -------------------------------------------------- */
            const channelIdentifierOr: any[] = [];

            if (phone_number_id) {
                channelIdentifierOr.push({
                    "channel_identifiers.phone_number_id": phone_number_id
                });
            }

            if (facebook_page_id) {
                channelIdentifierOr.push({
                    "channel_identifiers.facebook_page_id": facebook_page_id
                });
            }

            if (instagram_business_account_id) {
                channelIdentifierOr.push({
                    "channel_identifiers.instagram_business_account_id": instagram_business_account_id
                });
            }

            if (!channelIdentifierOr.length) {
                throw new Error("No valid channel identifiers provided");
            }

            /* --------------------------------------------------
               Common filter for ALL queries
            -------------------------------------------------- */
            const omniMessageFilter = {
                user_uuid: uuid,
                tenant_uuid,
                channel_type,
                $and: [
                    { $or: channelIdentifierOr },
                    {
                        $or: [
                            { from_number },
                            { to: from_number }
                        ]
                    }
                ]
            };

            /* --------------------------------------------------
               Fetch messages to archive
            -------------------------------------------------- */
            const omnichannelMessages = await this.omnichannelMessage
                .find(omniMessageFilter)
                .exec();

            /* --------------------------------------------------
               Prepare archive DTO
            -------------------------------------------------- */
            archieveomnimessagedto.user_uuid = uuid;
            archieveomnimessagedto.uuid = randomUUID();
            archieveomnimessagedto.type = type;
            archieveomnimessagedto.channel_type = channel_type;
            archieveomnimessagedto.channel_identifiers = channel_identifiers;
            archieveomnimessagedto.message_json = omnichannelMessages;

            /* --------------------------------------------------
               Save archived chat
            -------------------------------------------------- */
            const archiveDoc = new this.archieveomnichannelmessage(
                archieveomnimessagedto
            );
            await archiveDoc.save();

            /* --------------------------------------------------
               Delete live messages & sync data
            -------------------------------------------------- */
            await Promise.all([
                this.omnichannelMessage.deleteMany(omniMessageFilter).exec(),
                this.omnichannelSync.deleteMany(omniMessageFilter).exec()
            ]);

            /* --------------------------------------------------
               Delete live chat data from Omnichannnel Report
            -------------------------------------------------- */

            await this.omnichannel_report.findOneAndDelete({
                user_uuid: uuid,
                tenant_uuid,
                channel_type,
                $or: [
                    { from_number: phone_number_id },
                    { from_number: facebook_page_id },
                    { from_number: instagram_business_account_id }
                ]
            });

            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.CREATED,
                "End Chat Successfully"
            );

        } catch (error) {
            Logger.error(
                "Error in omnichannelendchat",
                error?.message || error
            );
            throw error;
        }
    }


}
