import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InboundCampaignDocument, InboundCampaignSchema } from "../schema/inbound-campaign.schema";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateInboundCampaignDto } from "../dto/create-inbound-campaign.dto";
import { deleteMethod, putMethod, patchMethod } from "src/global_constant";
import { InboundCampaignDispositionDto } from "../dto/inbound-campaign-disposition.dto";
import { InboundCampaignDispositionDocument, InboundCampaignDispositionSchema } from "../schema/inbound-campaign-disposition.schema";
import { InboundCallQueueDto } from "../dto/inbound-call-queue.dto";
import { CommonFunctions } from "src/modules/common/common_functions";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../../blended-campaign/schema/blended-campaign.schema";
import { LeadReportDocument, LeadReportSchema } from "src/modules/call-center/schema/lead-report.schema";
import { DncDocument, DncSchema } from "src/modules/dnc/schema/dnc.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "../../outbound-campaign/schema/outbound-campaign.schema";
import { AgentCampaignLoginDocument, AgentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';
import { ExtensionDocument, ExtensionSchema } from 'src/modules/extension/schema/extension.schema';
import { TenantDocument, TenantSchema } from 'src/modules/tenant/schema/tenant.schema';
import { AgentLiveReportDocument, AgentLiveReportSchema } from 'src/modules/call-center/schema/agent-live-report.schema';
import { SocketService } from 'src/modules/websockets/websockets.gateway';


@Injectable()

export class InboundCampaignService {

    /*
    @Usage              : To load inbound campaign schema and other libraries
    @Param @InjectModel : It will load inbound campaign schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [inbound_campaign,commonDbFn]
    */

    constructor(
        @InjectModel(InboundCampaignSchema.name) private readonly inbound_campaign: Model<InboundCampaignDocument>,
        @InjectModel(InboundCampaignDispositionSchema.name) private readonly inbound_campaign_disposition: Model<InboundCampaignDispositionDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(LeadReportSchema.name) private readonly lead_report: Model<LeadReportDocument>,
        @InjectModel(DncSchema.name) private readonly dnc: Model<DncDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(AgentCampaignLoginSchema.name) private readonly agent_campaign_login: Model<AgentCampaignLoginDocument>,
        @InjectModel(ExtensionSchema.name) private readonly extension: Model<ExtensionDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(AgentLiveReportSchema.name) private readonly agent_live_report: Model<AgentLiveReportDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        private readonly socketService: SocketService
    ) { }

    /*
    @Usage                           : First it will check whether given name exist or not , if not then new inbound campaign will be created else it will throw error
    @Param createInboundCampaignDto : Request paramter that we set into dto
    @return Object                   : Success / Error
    */

    async create(createInboundCampaignDto: CreateInboundCampaignDto) {
        const { name, tenant_uuid, role } = createInboundCampaignDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Inbound campaign already exist \n",
            logSuccessMsg: "Inbound campaign created successfully \n"
        }
        createInboundCampaignDto.campaign_type = "1";
        createInboundCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        return this.commonDbFn.findAndInsert(this.inbound_campaign, where, createInboundCampaignDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of inbound campaign with data
    */

    async findAll(queryParams) {
        let searchFields = ["name"];
        let populateFields = [{ path: "outgoing_rule", select: "name" }];
        return this.commonDbFn.findAllWithPagination(this.inbound_campaign, queryParams, searchFields, populateFields, { status: 1, _id: -1 });
    }

    /*
    @Usage          : To get single inbound campaign record based on uuid
    @Param uuid     : Search inbound campaign by uuid
    @return Object  : Result of inbound campaign
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Inbound campaign success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.inbound_campaign, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update(uuid: string, createInboundCampaignDto: CreateInboundCampaignDto) {
        const { name, tenant_uuid, role, call_queue_uuid } = createInboundCampaignDto;
        const getInboundCampaign = await this.inbound_campaign.findOne({ uuid }).exec();

        // Proactively log out agents from removed queues
        if (getInboundCampaign) {
            const oldQueues: any = getInboundCampaign.call_queue_uuid || [];
            const newQueues: any = call_queue_uuid || [];
            const removedQueues = oldQueues.filter(q => !newQueues.includes(q));

            if (removedQueues.length > 0) {
                const loggedInAgents = await this.agent_campaign_login.find({
                    campaign_uuid: uuid,
                    tenant_uuid: tenant_uuid,
                    login_status: "0"
                }).exec();

                for (const agentLogin of loggedInAgents) {
                    const agentUUID = agentLogin.agent_uuid;
                    const extensionData = await this.extension.findOne({ user_uuid: agentUUID, tenant_uuid: tenant_uuid }).exec();
                    const tenantData = await this.tenant.findOne({ uuid: tenant_uuid }).exec();

                    if (extensionData && tenantData) {
                        for (const queueUUID of removedQueues) {
                            Logger.debug(`Proactively logging out agent ${extensionData.username} from removed queue ${queueUUID}`);
                            await this.commonFn.addUpdateAgentInQueue(
                                extensionData.username,
                                tenantData.domain,
                                "", "", "", "logout", queueUUID
                            );
                        }
                    }
                }
            }
        }

        if (getInboundCampaign?.name != name) {
            const checkInboundCampaignExist = await this.inbound_campaign.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkInboundCampaignExist > 0) {
                Logger.error("Inbound campaign already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Inbound campaign already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Inbound campaign updated successfully by uuid : ${uuid} \n`
        }
        createInboundCampaignDto.campaign_type = "1";
        createInboundCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        const result = await this.commonDbFn.update(this.inbound_campaign, uuid, createInboundCampaignDto, JSON.stringify(logMessages));
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
            } catch (err) {
                Logger.error(`Error notifying agents of campaign update: ${err.message}`);
            }
        }
        return result;
    }

    /*
    @Usage              : To search inbound campaign using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of inbound campaign with data
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "outgoing_rule", select: "name" }];
        return this.commonDbFn.advancedSearch(this.inbound_campaign, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of Inbound campaign[Active/Inactive]
    @Param uuid    : uuid of inbound campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Inbound campaign status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.inbound_campaign, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple inbound campaign using uuid
    @Param uuid    : To delete single inbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Inbound campaign not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Inbound campaign deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.inbound_campaign, { uuid }, JSON.stringify(logMessages));
    }


    /**************************** Hangup Status Inbound Campaign ********************************/

    /*
        @Usage             : To get records based on limit,page,search
        @Param queryParams : It will contain page(default=1),limit(default=10),search
        @return Object     : Array of an object with total count of inbound campaign with data
        */


    async findAllHangupStatus(uuid: string) {
        // let queryParams:any
        // queryParams.campaign_uuid = uuid;
        let logMessages = {
            logErrorMsg: `Inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Inbound campaign success fetched by uuid : ${uuid} \n`
        }
        return this.inbound_campaign_disposition.find({ campaign_uuid: uuid }).exec();

        // return this.commonDbFn.sendResponseWithCount(this.inbound_campaign, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage                         : Add disposition from inbound campaign
    @Param createDispositionDto    : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async addDispositionFromCampaign(inboundCampaignDispositionDto: InboundCampaignDispositionDto) {
        const { tenant_uuid, inbound_campaign_uuid, name } = inboundCampaignDispositionDto;
        let where = [{ tenant_uuid }, { inbound_campaign_uuid }, { name }];
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.inbound_campaign_disposition, where, inboundCampaignDispositionDto, JSON.stringify(logMessages), "and");
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
        const result = await this.inbound_campaign_disposition.deleteMany({ inbound_campaign_disposition_uuid: { $in: uuids } }).exec();
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
    @Usage               : To fetch list based on case from campaign
    @Param campaign_uuid : campaign_uuid
    @Param projection    : fileds need to fetch from DB
    @Param tenant_uuid   : uuid of tenant
    @return string       : List of feature based on case from campaign
    */

    async fetchList(campaign_uuid, projection, tenant_uuid, campaign_type) {
        let result: any;
        //if(campaign_type == ""){
        result = await this.inbound_campaign.findOne({ uuid: campaign_uuid, tenant_uuid }, projection).exec();
        //}else{
        //  result = await this.blended_campaign.findOne({ uuid: campaign_uuid, tenant_uuid }, projection).exec();
        //}
        let statusCode = result != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage(statusCode, result);
    }



    /**************************** Call queue Inbound Campaign ********************************/

    /*
    @Usage                      : To add agent in call queue based
    @Param  inboundCallQueueDto : Request Dto
    @return Object              : Success / Error
    */

    async addAgentInQueueAndTier(inboundCallQueueDto: InboundCallQueueDto, agentState, feature) {
        console.log(agentState, 'agentState from agent in queue and tier');
        const { custom_callid, extension, domain, campaign_uuid, lead_management_uuid, lead_status, lead_status_1, lead_status_2, campaign_type, code, custom_phone_number, tenant_uuid, wrap_up_time, wrap_up_time_duration, pause } = inboundCallQueueDto;
        console.log("inside callqueueess inboun camapiafgnnnnn dtooooo", inboundCallQueueDto)
        try {
            let allData, finalResult, self = this;
            let populateFileds = [{ path: "call_queue_details", select: "name timeout -_id -uuid" }];
            let callQueues: any;
            if (campaign_type == "") {
                console.log("inside callqueueess inboun camapiafgnnnnn")
                callQueues = await this.inbound_campaign.findOne({ uuid: campaign_uuid }, { call_queue_uuid: 1, _id: 0 }).populate(populateFileds).exec();
            } else if (campaign_type == "0") {
                callQueues = await this.outbound_campaign.findOne({ uuid: campaign_uuid }, { call_queue_uuid: 1, _id: 0 }).populate(populateFileds).exec();
            } else {
                callQueues = await this.blended_campaign.findOne({ uuid: campaign_uuid }, { call_queue_uuid: 1, _id: 0 }).populate(populateFileds).exec();
                console.log("callQueues for blended campaign", callQueues);
            } 

            if (feature == "submit") {
                console.log("inside callqueueess inboun camapiafgnnnnn featurreeeee", feature)
                try {
                    //Update lead status
                    const result = await this.lead_management.updateOne({ lead_management_uuid }, { lead_status }).exec();
                    if (result.matchedCount == 0 && result.modifiedCount == 0) {
                        Logger.error(`Unable to update lead_status with lead : ${lead_management_uuid}`, patchMethod);
                    } else {
                        Logger.debug(`lead_status updated successfully with lead : ${lead_management_uuid}`, patchMethod);
                    }

                    //Update campaign & call_mode in cdrs
                    // let lastCdrsRecordDetail = await this.cdrs.findOne({ lead_uuid: lead_management_uuid , custom_callid, tenant_uuid}, { uuid: 1, _id: 0 }).sort({ _id: -1 }).exec();
                    // const cdrsResult = await this.cdrs.updateOne({ uuid: lastCdrsRecordDetail.uuid }, { campaign_uuid, call_mode: "1", wrap_up_time, wrap_up_time_duration, hangup_cause: lead_status ? lead_status : lead_status_1 ? lead_status_1 : lead_status_2 }).exec();
                    // if (cdrsResult.matchedCount == 0 && cdrsResult.modifiedCount == 0) {
                    //     Logger.error(`Unable to update campaign & call_mode in cdrs with uuid : ${lastCdrsRecordDetail.uuid}`, patchMethod);
                    // } else {
                    //     Logger.debug(`Updated campaign & call_mode successfully in cdrs with uuid : ${lastCdrsRecordDetail.uuid}`, patchMethod);
                    // }

                    let query: any = {
                        lead_uuid: lead_management_uuid,
                        tenant_uuid: tenant_uuid
                    };

                    // Only include custom_callid if it's not empty
                    if (custom_callid && custom_callid !== "") {
                        query.custom_callid = custom_callid;
                    }

                    try {
                        const updatedCdr = await this.cdrs.findOneAndUpdate(
                            query,
                            {
                                $set: {
                                    campaign_uuid,
                                    call_mode: "1",
                                    wrap_up_time,
                                    wrap_up_time_duration,
                                    hangup_cause: lead_status
                                        ? lead_status
                                        : lead_status_1
                                            ? lead_status_1
                                            : lead_status_2
                                }
                            },
                            {
                                sort: { createdAt: -1 }, // latest record
                                projection: { uuid: 1, _id: 0 },
                                new: true // return updated document
                            }
                        ).exec();

                        if (!updatedCdr) {
                            Logger.error(
                                `Unable to update campaign & call_mode in cdrs for custom_callid : ${custom_callid}`,
                                patchMethod
                            );
                        } else {
                            Logger.debug(
                                `Updated campaign & call_mode successfully in cdrs with uuid : ${updatedCdr.uuid}`,
                                patchMethod
                            );
                        }

                    } catch (error) {
                        Logger.error(
                            `Error while updating campaign & call_mode in cdrs : ${error.message}`,
                            patchMethod
                        );

                        // execution will continue below
                    }

                    if (campaign_type != "0") {
                        this.addUpdateEntryInLeadReport(lead_management_uuid);
                    }
                    if (code == "DNC") {
                        this.addEntryInDNC(custom_phone_number, campaign_uuid, tenant_uuid);
                    }

                } catch (error) {
                    Logger.error(`Error in catch block == addAgentInQueueAndTier()`, error.message);
                }
            }

            // if (pause) {
            //     return { statusCode: HttpStatus.OK, message: "Agent status set to pause" }
            // }

            if (callQueues.call_queue_uuid.length > 0) {
                return new Promise(async (resolve) => {
                    allData = callQueues.call_queue_uuid.map(async (data, i) => {
                        /*callQueueUUID = data;
                        callQueueName = "support";
                        addUpdateAgent = await self.commonFn.addUpdateAgentInQueue(extension,domain,callQueueTimeout,callQueueName,agentState,feature)*/
                        return {
                            statusCode: HttpStatus.OK,
                            result: await self.commonFn.addUpdateAgentInQueue(extension, domain, callQueues.call_queue_details[i].timeout, callQueues.call_queue_details[i].name, agentState, feature, data)
                        }
                    });

                    console.log("inside callqueueess inboun camapiafgnnnnn all dattaaaaaaa", allData, "::featyreeee::", feature)
                    // if (feature == "submit") {
                    //     console.log("inside callqueueess inboun camapiafgnnnnn featurreeeee", feature)
                    //     try {
                    //         //Update lead status
                    //         const result = await this.lead_management.updateOne({ lead_management_uuid }, { lead_status }).exec();
                    //         if (result.matchedCount == 0 && result.modifiedCount == 0) {
                    //             Logger.error(`Unable to update lead_status with lead : ${lead_management_uuid}`, patchMethod);
                    //         } else {
                    //             Logger.debug(`lead_status updated successfully with lead : ${lead_management_uuid}`, patchMethod);
                    //         }

                    //         //Update campaign & call_mode in cdrs
                    //         let lastCdrsRecordDetail = await this.cdrs.findOne({ lead_uuid: lead_management_uuid }, { uuid: 1, _id: 0 }).sort({ _id: -1 }).exec();
                    //         const cdrsResult = await this.cdrs.updateOne({ uuid: lastCdrsRecordDetail.uuid }, { campaign_uuid, call_mode: "1", wrap_up_time, wrap_up_time_duration, hangup_cause: lead_status_2 ? lead_status_2 : lead_status_1 ? lead_status_1 : lead_status }).exec();
                    //         if (cdrsResult.matchedCount == 0 && cdrsResult.modifiedCount == 0) {
                    //             Logger.error(`Unable to update campaign & call_mode in cdrs with uuid : ${lastCdrsRecordDetail.uuid}`, patchMethod);
                    //         } else {
                    //             Logger.debug(`Updated campaign & call_mode successfully in cdrs with uuid : ${lastCdrsRecordDetail.uuid}`, patchMethod);
                    //         }

                    //         if (campaign_type != "0") {
                    //             this.addUpdateEntryInLeadReport(lead_management_uuid);
                    //         }
                    //         if (code == "DNC") {
                    //             this.addEntryInDNC(custom_phone_number, campaign_uuid, tenant_uuid);
                    //         }

                    //     } catch (error) {
                    //         Logger.error(`Error in catch block == addAgentInQueueAndTier()`, error.message);
                    //     }
                    // }
                    finalResult = await Promise.all(allData);
                    let finalObj = {};
                    for (let i = 0; i < finalResult.length; i++) {
                        Object.assign(finalObj, finalResult[i]);
                    }
                    resolve(finalObj);
                });
            } else {
                if (feature == "logout") {
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Agent logged out successfully");
                }
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, []);
            }
        } catch (error) {
            Logger.error(`Error in catch block === addAgentInQueueAndTier() `, error.message);
        }
    }

    /*
    @Usage                      : To add/update data in lead report
    @Param lead_management_uuid : uuid of lead
    @return Object              : Success / Error
    */

    async addUpdateEntryInLeadReport(lead_management_uuid) {
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

}


