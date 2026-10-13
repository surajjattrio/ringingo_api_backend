import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "../schema/outbound-campaign.schema";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateOutboundCampaignDto } from "../dto/create-outbound-campaign.dto";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { OutboundCampaignDispositionDto } from "../dto/outbound-campaign-disposition";
import { OutboundCampaignDispositionDocument, OutboundCampaignDispositionSchema } from "../schema/outbound-campaign-disposition.schema";
import { OutboundCampaignDialableStatusDto } from "../dto/outbound-campaign-dialable-status.dto";
import { deleteMethod, putMethod } from "src/global_constant";
import { OutboundCampaignDialableDocument, OutboundCampaignDialableStatus } from "../schema/outbound-campaign-dialable-status";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "src/modules/lead-management/schema/leads-in-queue.schema";
import { ResetLeadDto } from "../dto/reset-lead.dto";
import { VoiceBroadcastDocument, VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";
import { log } from "handlebars/runtime";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { AgentLiveReportDocument, AgentLiveReportSchema } from 'src/modules/call-center/schema/agent-live-report.schema';
import { SocketService } from 'src/modules/websockets/websockets.gateway';
import { AgentCampaignLoginDocument, AgentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';
import { LeadResetJobDocument, LeadResetJobSchema } from '../lead-reset-queue/lead-reset-job.schema';

@Injectable()

export class OutboundCampaignService {

    /*
    @Usage              : To load outbound campaign schema and other libraries
    @Param @InjectModel : It will load outbound campaign schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [outbound_campaign,commonDbFn]
    */

    constructor(
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(OutboundCampaignDispositionSchema.name) private readonly outbound_campaign_disposition: Model<OutboundCampaignDispositionDocument>,
        @InjectModel(OutboundCampaignDialableStatus.name) private readonly outbound_campaign_diallable_status: Model<OutboundCampaignDialableDocument>,
        @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel(VoiceBroadcastSchema.name) private readonly voice_broadcast: Model<VoiceBroadcastDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(AgentLiveReportSchema.name) private readonly agent_live_report: Model<AgentLiveReportDocument>,
        @InjectModel(AgentCampaignLoginSchema.name) private readonly agent_campaign_login: Model<AgentCampaignLoginDocument>,
        @InjectModel(LeadResetJobSchema.name) private readonly lead_reset_job: Model<LeadResetJobDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly socketService: SocketService
    ) { }

    /*
    @Usage                           : First it will check whether given name exist or not , if not then new outbound campaign will be created else it will throw error
    @Param createOutboundCampaignDto : Request paramter that we set into dto
    @return Object                   : Success / Error
    */

    async create(createOutboundCampaignDto: CreateOutboundCampaignDto) {
        const { name, tenant_uuid, role } = createOutboundCampaignDto;
        let where = [{ name }, { tenant_uuid }];
        createOutboundCampaignDto.campaign_type = "0";
        createOutboundCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        try {
            let logMessages = {
                logErrorMsg: "Outbound campaign already exist \n",
                logSuccessMsg: "Outbound campaign created successfully \n"
            }
            //  let disposition_uuid : any = await this.disposition.findOne({ name : "NEW" }, { disposition_uuid: 1, _id: 0 }).exec();
            // disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";
            let response = await this.commonDbFn.findAndInsert(this.outbound_campaign, where, createOutboundCampaignDto, JSON.stringify(logMessages), "and", true);
            if (response.statusCode == 409) { return response; }

            let disposition_uuid: any = await this.disposition.findOne({ name: "NEW" }, { disposition_uuid: 1, _id: 0 }).exec();
            disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";

            let insertedUUID = response?.message?.uuid;

            let obj = { disposition_uuid, outbound_campaign_uuid: insertedUUID, tenant_uuid };
            let result = new this.outbound_campaign_diallable_status(obj);
            result = await result.save();
            Logger.debug(`Disposition with NEW created`);
            delete response.message;
            return response;

        } catch (error: any) {
            Logger.error(`Error in creating outbound campaign`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Error in creating outbound campaign");
        }
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of outbound campaign with data
    */

    async findAll(queryParams) {
        let searchFields = ["name"];
        let populateFields = [{ path: "outgoing_rule", select: "name" }];
        if (queryParams?.webhook === "true") {
            const result = await this.outbound_campaign.find({ tenant_uuid: queryParams.tenant_uuid }, { name: 1, uuid: 1, _id: 0 }).exec();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
        } else {
            return this.commonDbFn.findAllWithPagination(this.outbound_campaign, queryParams, searchFields, populateFields, { status: 1, _id: -1 });
        }
    }

    /*
    @Usage          : To get single outbound campaign record based on uuid
    @Param uuid     : Search outbound campaign by uuid
    @return Object  : Result of outbound campaign
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Outbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outbound campaign success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.outbound_campaign, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update(uuid: string, createOutboundCampaignDto: CreateOutboundCampaignDto) {
        const { name, tenant_uuid, role } = createOutboundCampaignDto;
        const getOutboundCampaign = await this.outbound_campaign.findOne({ uuid }).exec();
        if (getOutboundCampaign?.name != name) {
            const checkOutboundCampaignExist = await this.outbound_campaign.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkOutboundCampaignExist > 0) {
                Logger.error("Outbound campaign already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Outbound campaign already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Outbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outbound campaign updated successfully by uuid : ${uuid} \n`
        }
        createOutboundCampaignDto.campaign_type = "0";
        createOutboundCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        const result = await this.commonDbFn.update(this.outbound_campaign, uuid, createOutboundCampaignDto, JSON.stringify(logMessages));
        if (result && result.statusCode === HttpStatus.OK) {
            try {
                const loggedInAgents = await this.agent_live_report.find({
                    campaign_uuid: uuid,
                    status: { $ne: "6" }
                }).exec();
                
                for (const agentLogin of loggedInAgents) {
                    Logger.debug(`Emitting CAMPAIGN_UPDATED event to agent: ${agentLogin.agent_uuid}`);
                    this.socketService.emitToAgent(agentLogin.agent_uuid as string, {
                        type: 'CAMPAIGN_UPDATED',
                        payload: {
                            campaign_uuid: uuid
                        }
                    });
                }
            } catch (err:any) {
                Logger.error(`Error notifying agents of campaign update: ${err.message}`);
            }
        }
        return result;
    }

    /*
    @Usage              : To search outbound campaign using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of outbound campaign with data
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "outgoing_rule", select: "name" }];
        return this.commonDbFn.advancedSearch(this.outbound_campaign, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of Outbound campaign[Active/Inactive]
    @Param uuid    : uuid of outbound campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Outbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outbound campaign status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.outbound_campaign, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple outbound campaign using uuid
    @Param uuid    : To delete single outbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Outbound campaign not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Outbound campaign deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.outbound_campaign, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage                  : Get lead group based on outbound campaign uuid
    @Param campaign_uuid    : Campaign uuid
    @return Object          : Success / Error
    */

    async getLeads(queryParams, campaign_uuid: string) {
        let checkRole: any = {}, result, totalCount = 0, leadTabData: any;;
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);

        //Check role type
        let { role, tenant_uuid } = queryParams;
        if (role == "tenant" || role == "manager") {
            checkRole = { campaign_uuid, tenant_uuid };
        }

        Logger.debug(`Fetching data from role : ${role} with ${JSON.stringify(checkRole)}`);

        result = await this.lead_group.find({ $and: [checkRole] }, { uuid: 1, _id: 0, name: 1, status: 1 }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();

        //Do query for count only when result greater than 0
        if (result.length > 0) {
            totalCount = await this.lead_group.find({ $and: [checkRole] }).count().exec();
            //Get total count & queue count for each lead group
            leadTabData = await this.getTotalAndQueueCountFromLeadGroup(result);
        } else {
            leadTabData = [];
        }


        return this.commonDbFn.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, leadTabData, totalCount);
    }

    /*
    @Usage                  : Get lead group based on outbound campaign uuid
    @Param campaign_uuid    : Campaign uuid
    @return Object          : Success / Error
    */

    // async getDispositions(tenant_uuid: string, outbound_campaign_uuid: string, type = "") {
    //     let result;
    //     if (type == "campaign") {
    //         result = await this.outbound_campaign_disposition.find({ outbound_campaign_uuid }, { name: 1, _id: 0, outbound_campaign_disposition_uuid: 1, code: 1 }).sort({ _id: -1 }).exec();
    //     } else {

    //         let disposition = await this.disposition.find({
    //             $and: [
    //                 { level: 0 },
    //                 {
    //                     $or: [
    //                         { tenant_uuid: tenant_uuid },
    //                         { created_flag: "0" },
    //                         { campaign_uuid: outbound_campaign_uuid }
    //                     ]
    //                 }
    //             ]
    //         }, {
    //             name: 1,
    //             _id: 0,
    //             disposition_uuid: 1,
    //             code: 1
    //         }).sort({ _id: -1 }).exec();


    //         let campaignDisposition = await this.outbound_campaign_disposition.find({ outbound_campaign_uuid }, { name: 1, _id: 0, outbound_campaign_disposition_uuid: 1, code: 1 }).sort({ _id: -1 }).exec();
    //         return [...disposition, ...campaignDisposition];
    //     }
    //     return result;
    // }

    async getDispositions(tenant_uuid: string, outbound_campaign_uuid: string, type = "") {
        const restrictedTenantUuid = "408a40ac-0a27-43c3-b2bd-e03aa203f046";
        const codeFilterCondition = tenant_uuid === restrictedTenantUuid
            ? { code: { $nin: ["CB", "LB", "DNC", "XFER", "SALE ", "AA", "Auto_Originate", "NA", "NAVL", "Busy", "HOT", "ANA", "QM", "NEW"] } }
            : {};

        let result, tenant_details;

        tenant_details = await this.tenant.findOne({ uuid: tenant_uuid }).exec();
        // console.log("tenaaaaaaaaaaaa",tenant_details);
        // If only campaign-specific dispositions are needed
        if (type === "campaign") {
            result = await this.outbound_campaign_disposition.find(
                { outbound_campaign_uuid },
                { name: 1, _id: 0, outbound_campaign_disposition_uuid: 1, code: 1 }
            ).sort({ _id: -1 }).exec();

            return result;
        }

        // Recursive function to get all children
        const getChildren = async (parentId: string): Promise<any[]> => {
            const children = await this.disposition.find(
                {
                    $and: [
                        { parent_disposition: parentId },
                        codeFilterCondition,
                        {
                            $or: [
                                { created_flag: "0" },
                                {
                                    $and: [
                                        { created_flag: { $ne: "0" } },
                                        { campaign_uuid: outbound_campaign_uuid },
                                        { tenant_uuid }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 1,
                    _id: 0,
                    disposition_uuid: 1,
                    code: 1,
                    callback: 1,
                    has_children: 1
                }
            ).sort({ _id: -1 }).lean();

            for (const child of children) {
                if (child.has_children) {
                    (child as any).children = await getChildren((child as any).disposition_uuid);
                }
            }

            return children;
        };


        // Get top-level dispositions
        let disposition;
        if (tenant_details?.system_disposition === "1") {
            disposition = await this.disposition.find({
                $and: [
                    { level: 0 },
                    { tenant_uuid: tenant_uuid },
                    codeFilterCondition,
                    {
                        $or: [
                            { created_flag: "0" },
                            {
                                $and: [
                                    { created_flag: { $ne: "0" } },
                                    { campaign_uuid: outbound_campaign_uuid },
                                    { tenant_uuid }
                                ]
                            }
                        ]
                    }
                ]
            }, {
                name: 1,
                _id: 0,
                disposition_uuid: 1,
                code: 1,
                callback: 1,
                has_children: 1
            }).sort({ _id: -1 }).lean();
        }
        else {
            disposition = await this.disposition.find({
                $and: [
                    { level: 0 },
                    codeFilterCondition,
                    {
                        $or: [
                            { created_flag: "0" },
                            {
                                $and: [
                                    { created_flag: { $ne: "0" } },
                                    { campaign_uuid: outbound_campaign_uuid },
                                    { tenant_uuid }
                                ]
                            }
                        ]
                    }
                ]
            }, {
                name: 1,
                _id: 0,
                disposition_uuid: 1,
                code: 1,
                callback: 1,
                has_children: 1
            }).sort({ _id: -1 }).lean();
        }


        // Deduplicate by disposition_uuid
        const uniqueDispositionMap = new Map();
        for (const d of disposition) {
            uniqueDispositionMap.set(d.disposition_uuid, d);
        }
        const dispositions = [...uniqueDispositionMap.values()];

        // Attach recursive children
        for (const d of dispositions) {
            if (d.has_children) {
                d.children = await getChildren(d.disposition_uuid);
            }
        }

        // Get campaign-specific dispositions
        const campaignDisposition = await this.outbound_campaign_disposition.find(
            { outbound_campaign_uuid },
            { name: 1, _id: 0, outbound_campaign_disposition_uuid: 1, code: 1 }
        ).sort({ _id: -1 }).lean();

        // console.log("dispositions", dispositions);

        // Final combined list
        return [...dispositions, ...campaignDisposition];
    }


    /*
    @Usage                         : Add disposition from outbound campaign
    @Param createDispositionDto    : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async addDispositionFromCampaign(outboundCampaignDispositionDto: OutboundCampaignDispositionDto) {
        const { tenant_uuid, outbound_campaign_uuid, name } = outboundCampaignDispositionDto;
        let where = [{ tenant_uuid }, { outbound_campaign_uuid }, { name }];
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.outbound_campaign_disposition, where, outboundCampaignDispositionDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage                         : Add dialable status from outbound campaign
    @Param createDispositionDto    : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async addDialableStatusFromCampaign(outboundCampaignDialableStatusDto: OutboundCampaignDialableStatusDto) {
        const { disposition_uuid, tenant_uuid, outbound_campaign_disposition_uuid, outbound_campaign_uuid } = outboundCampaignDialableStatusDto;
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        }
        let where: any = [{ tenant_uuid }, { outbound_campaign_uuid }];
        // let orQuery = [];
        if (disposition_uuid != undefined) { where.push({ disposition_uuid }) }
        if (outbound_campaign_disposition_uuid != undefined) { where.push({ outbound_campaign_disposition_uuid }) }

        //  let where = { andQuery, orQuery };

        return this.commonDbFn.findAndInsert(this.outbound_campaign_diallable_status, where, outboundCampaignDialableStatusDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage                : Fetch dialable status for outbound campaign
    @Param queryParams    : Logged in user info
    @return Object        : Success / Error
    */

    async findAllDialableStatus(queryParams) {
        const { campaign_uuid } = queryParams;
        let populateFields = [{ path: "disposition", select: "name code -_id" }, { path: "outbound_campaign_disposition", select: "name code -_id" }];
        let checkRole: any = {}, result, totalCount = 0;
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);

        //Check Role type
        let { role, tenant_uuid } = queryParams;

        //Get data based on role
        if (role == "tenant") {
            checkRole = { tenant_uuid, outbound_campaign_uuid: campaign_uuid };
        } else {
            if (campaign_uuid != undefined) {
                checkRole = { outbound_campaign_uuid: campaign_uuid };
            }
        }

        Logger.debug(`Fetching data from role : ${role} with ${JSON.stringify(checkRole)}`);

        result = await this.outbound_campaign_diallable_status.find({ $and: [checkRole] }, { uuid: 1, _id: 0, outbound_campaign_disposition_uuid: 1, disposition_uuid: 1 }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).exec();

        //Do query for count only when result greater than 0
        if (result.length > 0) {
            totalCount = await this.outbound_campaign_diallable_status.find({ $and: [checkRole] }).count().exec();
        }

        return this.commonDbFn.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, totalCount);

    }

    /*
    @Usage               : Delete single or multiple dailable status campaign using uuid
    @Param  uuid         : To delete single dailable status pass one uuid , for multiple pass comma separated uuids without space
    @return Object       : Success / Error
    */

    async removeDailableStatus(uuid: string) {
        let logMessages = {
            logErrorMsg: `Dailable status not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Dailable status deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.outbound_campaign_diallable_status, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage               : To get queue count and total count of leads for each lead group
    @Param  result       : Lead groups data
    @return Array        : Array to return to client
    */

    async getTotalAndQueueCountFromLeadGroup(result) {
        return Promise.all(
            result.map(async (data) => {
                const [totalCount, queueCount] = await Promise.all([
                    this.lead_management.countDocuments({ lead_group_uuid: data.uuid }),
                    this.leads_in_queue.countDocuments({ lead_group_uuid: data.uuid, lead_sent: "1" })
                ]);

                return {
                    name: data.name,
                    totalCount,
                    queueCount,
                    status: data.status,
                    uuid: data.uuid
                };
            })
        );
    }

    /*
    @Usage         : To update status of Outbound campaign[Active/Inactive]
    @Param uuid    : uuid of outbound campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async resetLeads(resetLeadDto: ResetLeadDto) {
        const { lead_group_uuid, campaign_uuid, tenant_uuid, disposition_uuids } = resetLeadDto;

        //Check lead group status
        let leadGroupStatus = await this.lead_group.find({ uuid: lead_group_uuid, tenant_uuid, status: "0" }).count().exec();
        if (leadGroupStatus == 0) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Please enable lead group status to perform reset leads`);
        }

        let logMessages = {
            logErrorMsg: `Lead group not found by uuid : ${lead_group_uuid} with campaign ${campaign_uuid} \n`,
            logSuccessMsg: `Lead group reset successfully by uuid : ${lead_group_uuid} with campaign ${campaign_uuid} \n`
        }

        //Add all leads in queue based on mode
        try {
            let result: any;
            let allLeads: any;
            if (disposition_uuids && disposition_uuids.length > 0) {
                // Selective: only remove + re-add leads whose disposition was selected — other queued leads stay untouched
                allLeads = await this.lead_management.find({ lead_group_uuid, tenant_uuid, in_dnc: "1", campaign_uuid, lead_status: { $in: disposition_uuids } }).exec();
                const lmUuids = allLeads.map((l: any) => l.lead_management_uuid);
                await this.leads_in_queue.deleteMany({ lead_management_uuid: { $in: lmUuids }, lead_group_uuid, campaign_uuid, tenant_uuid }).exec();
                Logger.debug(`[resetLeads] selective mode — ${allLeads.length} leads for ${disposition_uuids.length} disposition(s)`);
            } else {
                // Original dialable-filter path: delete ALL then re-add dialable leads
                result = await this.leads_in_queue.deleteMany({ $and: [{ lead_group_uuid }, { campaign_uuid }, { tenant_uuid }] }).exec();
                if (result.deletedCount == 0 && result.deletedCount == 0) {
                    Logger.error(`${logMessages.logErrorMsg} \n`);
                } else {
                    Logger.debug("Leads deleted successfully from queue , on action of reset lead \n");
                }
        //Add all leads in queue if it exist in outbound_campaign_dialable_status collection
                let getAllCampaignDialable = await this.outbound_campaign_diallable_status.find({ outbound_campaign_uuid: campaign_uuid }, { disposition_uuid: 1, outbound_campaign_disposition_uuid: 1, _id: 0 }).exec();

                let leadStatusArr = [], lead_status;
                if (getAllCampaignDialable.length > 0) {
                    getAllCampaignDialable.map((data) => {
                        lead_status = data.disposition_uuid == undefined ? data.outbound_campaign_disposition_uuid : data.disposition_uuid;
                        leadStatusArr.push(lead_status);
                    });
                } else {
                    Logger.warn(`No dialable found for outbound campaign ${campaign_uuid} — adding all eligible leads`);
                }
            //campaign_uuid removed from condition
                // If no dialable statuses configured, fall back to all non-DNC leads (same behaviour as blended with no filter)
                const leadQuery: any = { lead_group_uuid, tenant_uuid, in_dnc: "1", campaign_uuid };
                if (leadStatusArr.length > 0) leadQuery.lead_status = { $in: leadStatusArr };
                allLeads = await this.lead_management.find(leadQuery).exec();
            //allLeads = await this.addAllLeadsInQueue(allLeads, tenant_uuid, campaign_uuid);
            }

            result = await this.leads_in_queue.insertMany(allLeads, { ordered: false });
            await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, campaign_uuid)
            Logger.debug("Added leads in queue , on action of reset lead \n");
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Lead group reset successfully`);
        } catch (error: any) {
            Logger.debug("Error in adding lead in queue", error.message);
            //return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Lead not found`);
        }
        //return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Lead group reset successfully`);
    }

    /*
    @Usage         : Poll the status of a lead-reset job queued via resetLeads()'s async path
    @Param job_uuid    : uuid returned when the job was queued
    @Param tenant_uuid : scopes the lookup to the requesting tenant
    @return object     : lead_reset_jobs document, or 404 if not found for this tenant
    */

    async getLeadResetJobStatus(job_uuid: string, tenant_uuid: string) {
        const job = await this.lead_reset_job.findOne({ job_uuid, tenant_uuid }, { _id: 0, __v: 0 }).exec();
        if (!job) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Lead reset job not found`);
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, job);
    }

    async googleSheetLeadsReset(resetLeadDto: ResetLeadDto) {
        const { lead_group_uuid, campaign_uuid, tenant_uuid, disposition_uuid } = resetLeadDto;
        // 1️⃣ Check lead group status
        const leadGroupStatus = await this.lead_group.find({ uuid: lead_group_uuid, tenant_uuid, status: "0" }).count().exec();

        if (leadGroupStatus == 0) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Please enable lead group status to perform reset leads`);
        }

        try {
            // 2️⃣ Build dialable query
            const dialableQuery: any = { outbound_campaign_uuid: campaign_uuid };
            if (disposition_uuid) {
                dialableQuery.$or = [
                    { disposition_uuid },
                    { outbound_campaign_disposition_uuid: disposition_uuid }
                ];
            }

            // 3️⃣ Fetch dialable statuses
            const getAllCampaignDialable = await this.outbound_campaign_diallable_status.find(dialableQuery, { disposition_uuid: 1, outbound_campaign_disposition_uuid: 1, _id: 0 }).exec();

            if (!getAllCampaignDialable.length) {
                Logger.warn(`[googleSheetLeadsReset] No dialable statuses found for campaign: ${campaign_uuid}. Queue NOT modified.`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `No dialable statuses configured for this campaign`);
            }

            // 4️⃣ Build leadStatusArr
            const leadStatusArr = getAllCampaignDialable.map(data => data.disposition_uuid ?? data.outbound_campaign_disposition_uuid).filter(Boolean); // remove nulls/undefined

            if (!leadStatusArr.length) {
                Logger.warn(`[googleSheetLeadsReset] Empty lead status array. Queue NOT modified.`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `No valid disposition UUIDs found`);
            }

            // 5️⃣ Fetch leads to re-queue BEFORE deleting
            const allEligibleLeads = await this.lead_management.find({ lead_group_uuid, tenant_uuid, campaign_uuid, in_dnc: "1", lead_status: { $in: leadStatusArr } }).exec();

            Logger.debug(`[googleSheetLeadsReset] Found ${allEligibleLeads.length} eligible leads`);

            if (!allEligibleLeads.length) {
                Logger.warn(`[googleSheetLeadsReset] No eligible leads found. Queue NOT modified.`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `No matching leads to queue`);
            }

            // 6️⃣ Find which leads are ALREADY in the queue — by their lead_management uuid
            const eligibleLeadUuids = allEligibleLeads.map(l => l.lead_management_uuid);
            const alreadyInQueue = await this.leads_in_queue.find({ lead_management_uuid: { $in: eligibleLeadUuids }, lead_group_uuid, campaign_uuid, tenant_uuid }, { lead_management_uuid: 1, _id: 0 }).exec();
            const alreadyQueuedUuids = new Set(alreadyInQueue.map(q => q.lead_management_uuid));
            // 7️⃣ Only keep leads NOT already in queue
            const newLeadsToAdd = allEligibleLeads.filter(l => !alreadyQueuedUuids.has(l.lead_management_uuid));

            Logger.debug(`[googleSheetLeadsReset] ${allEligibleLeads.length} eligible | ` + `${alreadyQueuedUuids.size} already queued | ` + `${newLeadsToAdd.length} new to add`);

            if (!newLeadsToAdd.length) {
                Logger.debug(`[googleSheetLeadsReset] All leads already in queue. Nothing to add.`);
                // Still update count in case it drifted
                await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, campaign_uuid);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Queue already up to date`);
            }

            // 8️⃣ Insert ONLY the new leads — queue count only goes UP, never hits zero
            await this.leads_in_queue.insertMany(newLeadsToAdd, { ordered: false });
            Logger.debug(`[googleSheetLeadsReset] Inserted ${newLeadsToAdd.length} new leads into queue`);

            // 8️⃣ Update count
            await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, campaign_uuid);

            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Added ${newLeadsToAdd.length} new leads to queue`);
        } catch (error: any) {
            Logger.error(`[googleSheetLeadsReset] Failed for campaign ${campaign_uuid}: ${error.message}`, error.stack);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, `googleSheetLeadsReset failed: ${error.message}`);
        }
    }

    /*
    @Usage            : Delete single or multiple campaign disposition using uuid
    @Param  uuid      : To delete single campaign disposition pass one uuid , for multiple pass comma separated uuids without space
    @return Object    : Success / Error
    */

    async removeCampaignDisposition(uuid: string) {
        let logMessages = {
            logErrorMsg: `Campaign disposition not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Campaign disposition deleted successfully by uuid : ${uuid} \n`
        }
        let uuids = uuid.split(",");
        const result = await this.outbound_campaign_disposition.deleteMany({ outbound_campaign_disposition_uuid: { $in: uuids } }).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if (result.deletedCount == 0) {
            Logger.error(logMessages.logErrorMsg, deleteMethod);
            logMessages.logErrorMsg = logMessages.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, logMessages.logErrorMsg, deletedCount);
        }
        Logger.debug(logMessages.logSuccessMsg);
        logMessages.logSuccessMsg = logMessages.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, logMessages.logSuccessMsg, deletedCount);
    }

    /*
    @Usage               : To add all leads in leads_in_queue collection for given lead group
    @Param  result       : Lead groups data
    @return Array        : Array to return to client
    */

    async addAllLeadsInQueue(result, tenant_uuid, campaign_uuid) {

        let leads = [], allData;
        let self = this;
        return new Promise(async function (resolve, reject) {
            allData = result.map(async (data) => {
                let result = await self.outbound_campaign_diallable_status.find({ $and: [{ $or: [{ tenant_uuid }, { outbound_campaign_uuid: campaign_uuid }] }, { $and: [{ outbound_campaign_uuid: campaign_uuid }, { $or: [{ disposition_uuid: data.lead_status }, { outbound_campaign_disposition_uuid: data.lead_status }] }] }] }).count().exec();
                if (result > 0) {
                    data.campaign_uuid = campaign_uuid;
                    data.lead_management_uuid = data.lead_management_uuid;
                    data.lead_sent = "1";
                    data.lead_group_uuid = data.lead_group_uuid;
                    leads.push(data);
                }
            });
            result = await Promise.all(allData);
            resolve(leads);
        });
    }


    /*
    @Usage               : To delete lead group from campaign
    @Param resetLeadDto  : Request DTO
    @return string       : Lead group deleted updated successfully from campaign
    */

    async updateLeadGroup(resetLeadDto: ResetLeadDto) {
        const { lead_group_uuid, tenant_uuid, campaign_uuid } = resetLeadDto;
        try {

            // 1️⃣ Delete Lead Group
            const deleteLeadGroup = await this.lead_group.deleteOne({
                uuid: lead_group_uuid,
                tenant_uuid,
                campaign_uuid
            });

            // 2️⃣ Delete related leads from queue
            const deleteQueueLeads = await this.leads_in_queue.deleteMany({
                campaign_uuid,
                lead_group_uuid
            });

            // 3️⃣ Unassign lead_group_uuid from lead_management
            const updateLeads = await this.lead_management.updateMany(
                { lead_group_uuid },
                { $set: { lead_group_uuid: "" } }
            );

            Logger.debug(`Lead group deleted count: ${deleteLeadGroup.deletedCount}`);
            Logger.debug(`Queue leads deleted: ${deleteQueueLeads.deletedCount}`);
            Logger.debug(`Lead management updated: ${updateLeads.modifiedCount}`);

            if (deleteLeadGroup.deletedCount > 0) {
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.OK,
                    "Lead group deleted successfully from campaign"
                );
            } else {
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.NOT_FOUND,
                    "Lead group not found or unable to delete"
                );
            }

        } catch (error: any) {
            Logger.error("Unable to delete lead group", error.message);

            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unable to delete lead group"
            );
        }
    }

    /*
    @Usage               : To fetch list based on case from campaign
    @Param campaign_uuid : campaign_uuid
    @Param projection    : fileds need to fetch from DB
    @Param tenant_uuid   : uuid of tenant
    @return string       : List of feature based on case from campaign
    */

    async fetchList(campaign_uuid, projection, tenant_uuid) {
        let result: any = await this.outbound_campaign.findOne({ uuid: campaign_uuid, tenant_uuid }, projection).exec();
        let statusCode = result != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage(statusCode, result);
    }

    /*
    @Usage               : To fetch outbound campaign & voice broadcast
    @Param queryParam    : request params
    @return Array        : Array contains outbound campaign & voice broadcast
    */

    async fetchOutboundAndVoiceBroadcastCampaign(queryParam) {
        try {
            const { tenant_uuid } = queryParam;
            let outboundCampaignResult = await this.outbound_campaign.find({ tenant_uuid }, { campaign_type: 1, uuid: 1, name: 1, status: 1, _id: 0 }).exec();
            let voiceBroadcastResult = await this.voice_broadcast.find({ tenant_uuid }, { campaign_type: 1, uuid: 1, name: 1, status: 1, _id: 0 }).exec();
            let finalResult = [...outboundCampaignResult, ...voiceBroadcastResult];
            let statusCode = finalResult.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage(statusCode, finalResult);
        } catch (error: any) {
            Logger.error(`Error in fetching outbound campaign & voice broadcast`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to fetch list`);
        }
    }

    /*
    @Usage               : To delete queue's on status inactive
    @Param queryParam    : request params
    @return Array        :
    */

    async deleteQueues(resetLeadDto: ResetLeadDto) {
        const { lead_group_uuid, campaign_uuid, tenant_uuid } = resetLeadDto;
        try {
            let result: any = await this.leads_in_queue.deleteMany({ $and: [{ lead_group_uuid }, { campaign_uuid }, { tenant_uuid }] }).exec();
            if (result.deletedCount == 0 && result.deletedCount == 0) {
                Logger.error(`Unable to add leads from queue ==> lead_group_uuid : ${lead_group_uuid} , campaign_uuid : ${lead_group_uuid} , tenant_uuid :${tenant_uuid}  \n`);
            } else {
                await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, campaign_uuid)
                Logger.debug("Leads deleted successfully from queue , on action of reset lead \n");
            }
        } catch (error: any) {
            Logger.error(`Error in catch block ==> deleteQueues()`, error.message);
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Lead deleted successfully`);
    }

    async campaign_dial_level(uuid: string, body: any) {
        try {
            const updatedCampaign = await this.outbound_campaign.updateOne(
                { uuid: uuid },
                { concurrent_call: body.dial_level }
            );
            if (!updatedCampaign) {
                // Handle the case where the campaign with the provided UUID is not found
                return { message: `Campaign with UUID ${uuid} not found.` };
            }
            Logger.debug(`Campaign dial level updated successfully for UUID ${uuid}`);
            Logger.debug("Campaign dial level updated successfully. \n");
            // return { message: 'Campaign dial level updated successfully.' };
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Campaign dial level updated successfully.`);

        } catch (error: any) {
            // Handle errors and return error response
            // console.error( error );
            // return { error: 'Failed to update campaign dial level.' };
            Logger.error(`Failed to update campaign dial level.`, error.message);
        }
    }

    /*
    @Usage         : Get campaign-wise lead group disposition breakdown for re-churning
    @Param queryParams : { tenant_uuid, role, status? }
    @return Array  : Campaigns with nested lead groups and per-disposition counts
    */

    async getLeadChurningData(queryParams: any) {
        const { tenant_uuid, status, search } = queryParams;
        const perPage = Math.min(Number(queryParams.limit) || 10, 100);
        const currentPage = Math.max(Number(queryParams.page) || 1, 1);
        const skip = perPage * (currentPage - 1);

        try {
            // 1. Build campaign filter with search + status support
            const campaignQuery: any = { tenant_uuid };
            if (status === 'active') campaignQuery.status = '0';
            else if (status === 'inactive') campaignQuery.status = '1';
            if (search) campaignQuery.name = { $regex: search, $options: 'i' };

            // 2. Count total + fetch paginated campaigns in parallel
            const [totalCount, campaigns] = await Promise.all([
                this.outbound_campaign.countDocuments(campaignQuery).exec(),
                this.outbound_campaign
                    .find(campaignQuery, { uuid: 1, name: 1, status: 1, _id: 0 })
                    .skip(skip).limit(perPage).lean().exec(),
            ]) as [number, any[]];

            if (!campaigns.length) {
                return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, [], totalCount);
            }

            const campaignUuids = campaigns.map((c: any) => c.uuid as string);

            // 3. Fetch all lead groups for these campaigns
            const leadGroups: any[] = await this.lead_group
                .find(
                    { campaign_uuid: { $in: campaignUuids }, tenant_uuid },
                    { uuid: 1, name: 1, campaign_uuid: 1, status: 1, _id: 0 }
                )
                .lean()
                .exec() as any[];

            const leadGroupUuids = leadGroups.map((lg: any) => lg.uuid as string);

            if (!leadGroupUuids.length) {
                const result = campaigns.map((c: any) => ({
                    campaign_uuid: c.uuid,
                    campaign_name: c.name,
                    status: c.status,
                    lead_groups: [],
                }));
                return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, totalCount);
            }

            // All 4 aggregations only depend on leadGroupUuids — run in parallel
            const [leadBreakdown, leadTotals, queueTotals, queueBreakdown] = await Promise.all([
                this.lead_management.aggregate([
                    { $match: { lead_group_uuid: { $in: leadGroupUuids }, tenant_uuid } },
                    { $group: { _id: { lg: '$lead_group_uuid', status: '$lead_status' }, lead_count: { $sum: 1 } } },
                ]),
                this.lead_management.aggregate([
                    { $match: { lead_group_uuid: { $in: leadGroupUuids }, tenant_uuid } },
                    { $group: { _id: '$lead_group_uuid', total: { $sum: 1 } } },
                ]),
                this.leads_in_queue.aggregate([
                    { $match: { lead_group_uuid: { $in: leadGroupUuids }, tenant_uuid, lead_sent: "1" } },
                    { $group: { _id: '$lead_group_uuid', queue_count: { $sum: 1 } } },
                ]),
                this.leads_in_queue.aggregate([
                    { $match: { lead_group_uuid: { $in: leadGroupUuids }, tenant_uuid, lead_sent: "1" } },
                    {
                        $lookup: {
                            from: 'lead_management',
                            localField: 'lead_management_uuid',
                            foreignField: 'lead_management_uuid',
                            as: 'lead_info',
                        },
                    },
                    { $unwind: { path: '$lead_info', preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: {
                                lg: '$lead_group_uuid',
                                status: '$lead_info.lead_status',
                            },
                            queue_count: { $sum: 1 },
                        },
                    },
                ]),
            ]) as [any[], any[], any[], any[]];

            // Disposition lookup depends on leadBreakdown result — single round after the parallel block
            const dispositionUuids = [...new Set(leadBreakdown.map((d: any) => d._id.status).filter(Boolean))];
            const dispositions: any[] = dispositionUuids.length
                ? await this.disposition
                    .find(
                        { disposition_uuid: { $in: dispositionUuids } },
                        { disposition_uuid: 1, name: 1, code: 1, _id: 0 }
                    )
                    .lean()
                    .exec() as any[]
                : [];

            const dispositionMap = new Map<string, any>(
                dispositions.map((d: any) => [d.disposition_uuid as string, d])
            );

            // 8. Build lookup maps
            const leadTotalMap = new Map<string, number>(
                leadTotals.map((l: any) => [l._id as string, l.total as number])
            );
            const queueTotalMap = new Map<string, number>(
                queueTotals.map((q: any) => [q._id as string, q.queue_count as number])
            );

            const lgLeadMap = new Map<string, Array<{ status: string; count: number }>>();
            for (const item of leadBreakdown) {
                const key = item._id.lg as string;
                if (!lgLeadMap.has(key)) lgLeadMap.set(key, []);
                lgLeadMap.get(key)!.push({ status: item._id.status as string, count: item.lead_count as number });
            }

            const lgQueueMap = new Map<string, Map<string, number>>();
            for (const item of queueBreakdown) {
                const lgKey = item._id.lg as string;
                const statusKey = item._id.status as string;
                if (!lgQueueMap.has(lgKey)) lgQueueMap.set(lgKey, new Map());
                lgQueueMap.get(lgKey)!.set(statusKey, item.queue_count as number);
            }

            // 9. Group lead groups by campaign
            const lgByCampaign = new Map<string, any[]>();
            for (const lg of leadGroups) {
                const campKey = lg.campaign_uuid as string;
                if (!lgByCampaign.has(campKey)) lgByCampaign.set(campKey, []);

                const lgLeads = lgLeadMap.get(lg.uuid as string) || [];
                const lgQueue = lgQueueMap.get(lg.uuid as string) || new Map<string, number>();
                const totalLeads = leadTotalMap.get(lg.uuid as string) || 0;
                const queueTotal = queueTotalMap.get(lg.uuid as string) || 0;

                const dispositionsData = lgLeads.map((item) => {
                    const disp = item.status ? dispositionMap.get(item.status) : undefined;
                    const queueCount = lgQueue.get(item.status ?? null) || 0;
                    return {
                        disposition_uuid: item.status ?? '',
                        disposition_name: disp?.name || 'Unknown',
                        disposition_code: disp?.code || '',
                        queue_count: queueCount,
                        lead_count: item.count,
                    };
                });

                lgByCampaign.get(campKey)!.push({
                    lead_group_uuid: lg.uuid,
                    lead_group_name: lg.name,
                    status: lg.status,
                    queue_count: queueTotal,
                    total_leads: totalLeads,
                    dispositions: dispositionsData,
                });
            }

            // 10. Build final response
            const result = campaigns.map((c: any) => ({
                campaign_uuid: c.uuid,
                campaign_name: c.name,
                status: c.status,
                lead_groups: lgByCampaign.get(c.uuid as string) || [],
            }));

            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, totalCount);

        } catch (error: any) {
            Logger.error('Error in getLeadChurningData', error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, 'Error fetching lead churning data');
        }
    }
}
