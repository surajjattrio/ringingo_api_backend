import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";

import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { deleteMethod, putMethod } from "src/global_constant";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "src/modules/lead-management/schema/leads-in-queue.schema";
import { ResetLeadDto } from "../../outbound-campaign/dto/reset-lead.dto";
import { VoiceBroadcastDocument, VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../schema/blended-campaign.schema";
import { BlendedCampaignDispositionDocument, BlendedCampaignDispositionSchema } from "../schema/blended-campaign-disposition";
import { BlendedCampaignDialableDocument, BlendedCampaignDialableStatus } from "../schema/blended-campaign-dialable-status";
import { CreateBlendedCampaignDto } from "../dto/create-blended-campaign.dto";
import { BlendedCampaignDispositionDto } from "../dto/blended-campaign-disposition";
import { BlendedCampaignDialableStatusDto } from "../dto/blended-campaign-dialable-status.dto";
import { AgentCampaignLoginDocument, AgentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';
import { ExtensionDocument, ExtensionSchema } from 'src/modules/extension/schema/extension.schema';
import { TenantDocument, TenantSchema } from 'src/modules/tenant/schema/tenant.schema';
import { CommonFunctions } from "src/modules/common/common_functions";

@Injectable()

export class BlendedCampaignService {

    /*
    @Usage              : To load blended campaign schema and other libraries
    @Param @InjectModel : It will load blended campaign schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [blended_campaign,commonDbFn]
    */

    constructor(
        @InjectModel( BlendedCampaignSchema.name ) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel( LeadGroupSchema.name ) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel( DispositionSchema.name ) private readonly disposition: Model<DispositionDocument>,
        @InjectModel( LeadManagementSchema.name ) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel( BlendedCampaignDispositionSchema.name ) private readonly blended_campaign_disposition: Model<BlendedCampaignDispositionDocument>,
        @InjectModel( BlendedCampaignDialableStatus.name ) private readonly blended_campaign_diallable_status: Model<BlendedCampaignDialableDocument>,
        @InjectModel( LeadsInQueueSchema.name ) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel( VoiceBroadcastSchema.name ) private readonly voice_broadcast: Model<VoiceBroadcastDocument>,
        @InjectModel(AgentCampaignLoginSchema.name) private readonly agent_campaign_login: Model<AgentCampaignLoginDocument>,
        @InjectModel(ExtensionSchema.name) private readonly extension: Model<ExtensionDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage                           : First it will check whether given name exist or not , if not then new blended campaign will be created else it will throw error
    @Param createBlendedCampaignDto : Request paramter that we set into dto
    @return Object                   : Success / Error
    */

    async create ( createBlendedCampaignDto: CreateBlendedCampaignDto ) {
        const { name, tenant_uuid, role } = createBlendedCampaignDto;
        let where = [ { name }, { tenant_uuid } ];
        createBlendedCampaignDto.campaign_type = "2";
        createBlendedCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        try {
            let logMessages = {
                logErrorMsg: "Blended campaign already exist \n",
                logSuccessMsg: "Blended campaign created successfully \n"
            }
            //  let disposition_uuid : any = await this.disposition.findOne({ name : "NEW" }, { disposition_uuid: 1, _id: 0 }).exec();
            // disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";
            let response = await this.commonDbFn.findAndInsert( this.blended_campaign, where, createBlendedCampaignDto, JSON.stringify( logMessages ), "and", true );
            if ( response.statusCode == 409 ) { return response; }

            let disposition_uuid: any = await this.disposition.findOne( { name: "NEW" }, { disposition_uuid: 1, _id: 0 } ).exec();
            disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";

            let insertedUUID = response?.message?.uuid;

            let obj = { disposition_uuid, blended_campaign_uuid: insertedUUID, tenant_uuid };
            let result = new this.blended_campaign_diallable_status( obj );
            result = await result.save();
            Logger.debug( `Disposition with NEW created` );
            delete response.message;
            return response;

        } catch ( error ) {
            Logger.error( `Error in creating blended campaign`, error.message );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "Error in creating blended campaign" );
        }
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of blended campaign with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "name" ];
        let populateFields = [ { path: "outgoing_rule", select: "name" }];
        return this.commonDbFn.findAllWithPagination( this.blended_campaign, queryParams, searchFields, populateFields, { status: 1, _id: -1 });
    }

    /*
    @Usage          : To get single blended campaign record based on uuid
    @Param uuid     : Search blended campaign by uuid
    @return Object  : Result of blended campaign
    */

    async findOne ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Blended campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Blended campaign success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne( this.blended_campaign, uuid, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update(uuid: string, createBlendedCampaignDto: CreateBlendedCampaignDto) {
        const { name, tenant_uuid, role, call_queue_uuid } = createBlendedCampaignDto;
        const getBlendedCampaign = await this.blended_campaign.findOne( { uuid } ).exec();

        // Proactively log out agents from removed queues
        if (getBlendedCampaign) {
            const oldQueues: any = getBlendedCampaign.call_queue_uuid || [];
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
        if ( getBlendedCampaign?.name != name ) {
            const checkBlendedCampaignExist = await this.blended_campaign.find( { $and: [ { name }, { tenant_uuid } ] } ).count().exec();
            if ( checkBlendedCampaignExist > 0 ) {
                Logger.error( "Blended campaign already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Blended campaign already exist` );
            }
        }
        let logMessages = {
            logErrorMsg: `Blended campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Blended campaign updated successfully by uuid : ${uuid} \n`
        }
        createBlendedCampaignDto.campaign_type = "2";
        createBlendedCampaignDto.created_flag = role == "tenant" ? "1" : "2";
        return this.commonDbFn.update( this.blended_campaign, uuid, createBlendedCampaignDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search blended campaign using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of blended campaign with data
    */

    async advancedSearch ( searchParams ) {
        let populateFields = [ { path: "outgoing_rule", select: "name" } ];
        return this.commonDbFn.advancedSearch( this.blended_campaign, searchParams, populateFields );
    }

    /*
    @Usage         : To update status of Blended campaign[Active/Inactive]
    @Param uuid    : uuid of blended campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Blended campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Blended campaign status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.blended_campaign, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple blended campaign using uuid
    @Param uuid    : To delete single blended campaign pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Blended campaign not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Blended campaign deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.blended_campaign, { uuid }, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                  : Get lead group based on blended campaign uuid
    @Param campaign_uuid    : Campaign uuid
    @return Object          : Success / Error
    */

    async getLeads ( queryParams, campaign_uuid: string ) {
        let checkRole: any = {}, result, totalCount = 0, leadTabData: any;;
        const perPage = Number( queryParams.limit ) || 10;
        const currentPage = Number( queryParams.page ) || 1;
        const skip = perPage * ( currentPage - 1 );

        //Check role type
        let { role, tenant_uuid } = queryParams;
        if ( role == "tenant" || role == "manager" ) {
            checkRole = { campaign_uuid, tenant_uuid };
        }

        Logger.debug( `Fetching data from role : ${role} with ${JSON.stringify( checkRole )}` );

        result = await this.lead_group.find( { $and: [ checkRole ] }, { uuid: 1, _id: 0, name: 1, status: 1 } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).exec();

        //Do query for count only when result greater than 0
        if ( result.length > 0 ) {
            totalCount = await this.lead_group.find( { $and: [ checkRole ] } ).count().exec();
            //Get total count & queue count for each lead group
            leadTabData = await this.getTotalAndQueueCountFromLeadGroup( result );
        } else {
            leadTabData = [];
        }


        return this.commonDbFn.sendResponseWithCount( result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, leadTabData, totalCount );
    }

    /*
    @Usage                  : Get lead group based on blended campaign uuid
    @Param campaign_uuid    : Campaign uuid
    @return Object          : Success / Error
    */

    async getDispositions ( tenant_uuid: string, blended_campaign_uuid: string, type = "" ) {
        let result;
        if ( type == "campaign" ) {
            result = await this.blended_campaign_disposition.find( { blended_campaign_uuid }, { name: 1, _id: 0, blended_campaign_disposition_uuid: 1, code: 1 } ).sort( { _id: -1 } ).exec();
        } else {
            let disposition = await this.disposition.find( { $and: [ { $or: [ { tenant_uuid }, { created_flag: "0" } ] } ] }, { name: 1, _id: 0, disposition_uuid: 1, code: 1 } ).sort( { _id: -1 } ).exec();
            let campaignDisposition = await this.blended_campaign_disposition.find( { blended_campaign_uuid }, { name: 1, _id: 0, blended_campaign_disposition_uuid: 1, code: 1 } ).sort( { _id: -1 } ).exec();
            return [ ...disposition, ...campaignDisposition ];
        }
        return result;
    }

    /*
    @Usage                         : Add disposition from blended campaign
    @Param createDispositionDto    : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async addDispositionFromCampaign ( blendedCampaignDispositionDto: BlendedCampaignDispositionDto ) {
        const { tenant_uuid, blended_campaign_uuid, name } = blendedCampaignDispositionDto;
        let where = [ { tenant_uuid }, { blended_campaign_uuid }, { name } ];
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        }
        return this.commonDbFn.findAndInsert( this.blended_campaign_disposition, where, blendedCampaignDispositionDto, JSON.stringify( logMessages ), "and" );
    }

    /*
    @Usage                         : Add dialable status from blended campaign
    @Param createDispositionDto    : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async addDialableStatusFromCampaign ( blendedCampaignDialableStatusDto: BlendedCampaignDialableStatusDto ) {
        const { disposition_uuid, tenant_uuid, blended_campaign_disposition_uuid, blended_campaign_uuid } = blendedCampaignDialableStatusDto;
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        }
        let where: any = [ { tenant_uuid }, { blended_campaign_uuid } ];
        // let orQuery = [];
        if ( disposition_uuid != undefined ) { where.push( { disposition_uuid } ) }
        if ( blended_campaign_disposition_uuid != undefined ) { where.push( { blended_campaign_disposition_uuid } ) }

        //  let where = { andQuery, orQuery };

        return this.commonDbFn.findAndInsert( this.blended_campaign_diallable_status, where, blendedCampaignDialableStatusDto, JSON.stringify( logMessages ), "and" );
    }

    /*
    @Usage                : Fetch dialable status for blended campaign
    @Param queryParams    : Logged in user info
    @return Object        : Success / Error
    */

    async findAllDialableStatus ( queryParams ) {
        const { campaign_uuid } = queryParams;
        let populateFields = [ { path: "disposition", select: "name code -_id" }, { path: "blended_campaign_disposition", select: "name code -_id" } ];
        let checkRole: any = {}, result, totalCount = 0;
        const perPage = Number( queryParams.limit ) || 10;
        const currentPage = Number( queryParams.page ) || 1;
        const skip = perPage * ( currentPage - 1 );

        //Check Role type
        let { role, tenant_uuid } = queryParams;

        //Get data based on role
        if ( role == "tenant" ) {
            checkRole = { tenant_uuid, blended_campaign_uuid: campaign_uuid };
        } else {
            if ( campaign_uuid != undefined ) {
                checkRole = { blended_campaign_uuid: campaign_uuid };
            }
        }

        Logger.debug( `Fetching data from role : ${role} with ${JSON.stringify( checkRole )}` );

        result = await this.blended_campaign_diallable_status.find( { $and: [ checkRole ] }, { uuid: 1, _id: 0, blended_campaign_disposition_uuid: 1, disposition_uuid: 1 } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();

        //Do query for count only when result greater than 0
        if ( result.length > 0 ) {
            totalCount = await this.blended_campaign_diallable_status.find( { $and: [ checkRole ] } ).count().exec();
        }

        return this.commonDbFn.sendResponseWithCount( result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, totalCount );

    }

    /*
    @Usage               : Delete single or multiple dailable status campaign using uuid
    @Param  uuid         : To delete single dailable status pass one uuid , for multiple pass comma separated uuids without space
    @return Object       : Success / Error
    */

    async removeDailableStatus ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Dailable status not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Dailable status deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.blended_campaign_diallable_status, { uuid }, JSON.stringify( logMessages ) );
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
    @Usage         : To update status of Blended campaign[Active/Inactive]
    @Param uuid    : uuid of blended campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async resetLeads ( resetLeadDto: ResetLeadDto ) {
        const { lead_group_uuid, campaign_uuid, tenant_uuid } = resetLeadDto;

        //Check lead group status
        let leadGroupStatus = await this.lead_group.find( { uuid: lead_group_uuid, tenant_uuid, status: "0" } ).count().exec();
        if ( leadGroupStatus == 0 ) {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Please enable lead group status to perform reset leads` );
        }

        let logMessages = {
            logErrorMsg: `Lead group not found by uuid : ${lead_group_uuid} with campaign ${campaign_uuid} \n`,
            logSuccessMsg: `Lead group reset successfully by uuid : ${lead_group_uuid} with campaign ${campaign_uuid} \n`
        }

        let result: any = await this.leads_in_queue.deleteMany( { $and: [ { lead_group_uuid }, { campaign_uuid }, { tenant_uuid } ] } ).exec();
        if ( result.deletedCount == 0 && result.deletedCount == 0 ) {
            Logger.error( `${logMessages.logErrorMsg} \n` );
        } else {
            Logger.debug( "Leads deleted successfully from queue , on action of reset lead \n" );
        }
        //Add all leads in queue if it exist in outbound_campaign_dialable_status collection
        try {
            let getAllCampaignDialable = await this.blended_campaign_diallable_status.find( { blended_campaign_uuid: campaign_uuid }, { disposition_uuid: 1, blended_campaign_disposition_uuid: 1, _id: 0 } ).exec();

            let leadStatusArr = [], lead_status;
            if ( getAllCampaignDialable.length > 0 ) {
                getAllCampaignDialable.map( ( data ) => {
                    lead_status = data.disposition_uuid == undefined ? data.blended_campaign_disposition_uuid : data.disposition_uuid;
                    leadStatusArr.push( lead_status );
                } );
            } else {
                Logger.warn( `No dialable found` );
            }
            //campaign_uuid removed from condition
            let allLeads: any = await this.lead_management.find( { lead_group_uuid, tenant_uuid, in_dnc: "1", campaign_uuid, lead_status: { $in: leadStatusArr } } ).exec();
            //allLeads = await this.addAllLeadsInQueue(allLeads, tenant_uuid, campaign_uuid);

            result = await this.leads_in_queue.insertMany( allLeads, { ordered: false } );
            await this.commonDbFn.leads_in_queue_count_update( this.leads_in_queue, this.blended_campaign, campaign_uuid )
            Logger.debug( "Added leads in queue , on action of reset lead \n" );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Lead group reset successfully` );
        } catch ( error ) {
            Logger.debug( "Error in adding lead in queue", error.message );
            //return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Lead not found`);
        }
        //return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Lead group reset successfully`);
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
            const dialableQuery: any = { blended_campaign_uuid: campaign_uuid };
            if (disposition_uuid) {
                dialableQuery.$or = [
                    { disposition_uuid },
                    { blended_campaign_disposition_uuid: disposition_uuid }
                ];
            }

            // 3️⃣ Fetch dialable statuses
            const getAllCampaignDialable = await this.blended_campaign_diallable_status.find(dialableQuery, { disposition_uuid: 1, blended_campaign_disposition_uuid: 1, _id: 0 }).exec();

            if (!getAllCampaignDialable.length) {
                Logger.warn(`[googleSheetLeadsReset] No dialable statuses found for campaign: ${campaign_uuid}. Queue NOT modified.`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `No dialable statuses configured for this campaign`);
            }

            // 4️⃣ Build leadStatusArr
            const leadStatusArr = getAllCampaignDialable.map(data => data.disposition_uuid ?? data.blended_campaign_disposition_uuid).filter(Boolean); // remove nulls/undefined

            if (!leadStatusArr.length) {
                Logger.warn(`[googleSheetLeadsReset] Empty lead status array. Queue NOT modified.`);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `No valid disposition UUIDs found`);
            }

            // 5️⃣ Fetch ALL eligible leads from lead_management
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
                await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, campaign_uuid);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Queue already up to date`);
            }

            // 8️⃣ Insert ONLY the new leads — queue count only goes UP, never hits zero
            await this.leads_in_queue.insertMany(newLeadsToAdd, { ordered: false });
            Logger.debug(`[googleSheetLeadsReset] Inserted ${newLeadsToAdd.length} new leads into queue`);

            // 9️⃣ Update count
            await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, campaign_uuid);

            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Added ${newLeadsToAdd.length} new leads to queue`);
        } catch (error) {
            Logger.error(`[googleSheetLeadsReset] Failed for campaign ${campaign_uuid}: ${error.message}`, error.stack);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, `googleSheetLeadsReset failed: ${error.message}`);
        }
    }

    /*
    @Usage            : Delete single or multiple campaign disposition using uuid
    @Param  uuid      : To delete single campaign disposition pass one uuid , for multiple pass comma separated uuids without space
    @return Object    : Success / Error
    */

    async removeCampaignDisposition ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Campaign disposition not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Campaign disposition deleted successfully by uuid : ${uuid} \n`
        }
        let uuids = uuid.split( "," );
        const result = await this.blended_campaign_disposition.deleteMany( { blended_campaign_disposition_uuid: { $in: uuids } } ).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if ( result.deletedCount == 0 ) {
            Logger.error( logMessages.logErrorMsg, deleteMethod );
            logMessages.logErrorMsg = logMessages.logErrorMsg.split( "by" )[ 0 ].trim();
            return this.commonDbFn.sendResponseWithCount( HttpStatus.NOT_FOUND, logMessages.logErrorMsg, deletedCount );
        }
        Logger.debug( logMessages.logSuccessMsg );
        logMessages.logSuccessMsg = logMessages.logSuccessMsg.split( "by" )[ 0 ].trim();
        return this.commonDbFn.sendResponseWithCount( HttpStatus.OK, logMessages.logSuccessMsg, deletedCount );
    }

    /*
    @Usage               : To add all leads in leads_in_queue collection for given lead group
    @Param  result       : Lead groups data
    @return Array        : Array to return to client
    */

    async addAllLeadsInQueue ( result, tenant_uuid, campaign_uuid ) {

        let leads = [], allData;
        let self = this;
        return new Promise( async function ( resolve, reject ) {
            allData = result.map( async ( data ) => {
                let result = await self.blended_campaign_diallable_status.find( { $and: [ { $or: [ { tenant_uuid }, { blended_campaign_uuid: campaign_uuid } ] }, { $and: [ { blended_campaign_uuid: campaign_uuid }, { $or: [ { disposition_uuid: data.lead_status }, { blended_campaign_disposition_uuid: data.lead_status } ] } ] } ] } ).count().exec();
                if ( result > 0 ) {
                    data.campaign_uuid = campaign_uuid;
                    data.lead_management_uuid = data.lead_management_uuid;
                    data.lead_sent = "1";
                    data.lead_group_uuid = data.lead_group_uuid;
                    leads.push( data );
                }
            } );
            result = await Promise.all( allData );
            resolve( leads );
        } );
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

        } catch (error) {
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

    async fetchList ( campaign_uuid, projection, tenant_uuid ) {
        let result: any = await this.blended_campaign.findOne( { uuid: campaign_uuid, tenant_uuid }, projection ).exec();
        let statusCode = result != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage( statusCode, result );
    }

    /*
    @Usage               : To fetch blended campaign & voice broadcast
    @Param queryParam    : request params
    @return Array        : Array contains blended campaign & voice broadcast
    */

    async fetchBlendedAndVoiceBroadcastCampaign ( queryParam ) {
        try {
            const { tenant_uuid } = queryParam;
            let blendedcampaignResult = await this.blended_campaign.find( { tenant_uuid }, { campaign_type: 1, uuid: 1, name: 1, status: 1, _id: 0 } ).exec();
            let voiceBroadcastResult = await this.voice_broadcast.find( { tenant_uuid }, { campaign_type: 1, uuid: 1, name: 1, status: 1, _id: 0 } ).exec();
            let finalResult = [ ...blendedcampaignResult, ...voiceBroadcastResult ];
            let statusCode = finalResult.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage( statusCode, finalResult );
        } catch ( error ) {
            Logger.error( `Error in fetching blended campaign & voice broadcast`, error.message );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Unable to fetch list` );
        }
    }

    /*
    @Usage               : To delete queue's on status inactive
    @Param queryParam    : request params
    @return Array        :
    */

    async deleteQueues ( resetLeadDto: ResetLeadDto ) {
        const { lead_group_uuid, campaign_uuid, tenant_uuid } = resetLeadDto;
        try {
            let result: any = await this.leads_in_queue.deleteMany( { $and: [ { lead_group_uuid }, { campaign_uuid }, { tenant_uuid } ] } ).exec();
            if ( result.deletedCount == 0 && result.deletedCount == 0 ) {
                Logger.error( `Unable to add leads from queue ==> lead_group_uuid : ${lead_group_uuid} , campaign_uuid : ${lead_group_uuid} , tenant_uuid :${tenant_uuid}  \n` );
            } else {
                await this.commonDbFn.leads_in_queue_count_update( this.leads_in_queue, this.blended_campaign, campaign_uuid )
                Logger.debug( "Leads deleted successfully from queue , on action of reset lead \n" );
            }
        } catch ( error ) {
            Logger.error( `Error in catch block ==> deleteQueues()`, error.message );
        }
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Lead deleted successfully` );
    }

    async campaign_dial_level ( uuid: string, body: any ) {
        try {
            const updatedCampaign = await this.blended_campaign.updateOne(
                { uuid: uuid },
                { concurrent_call: body.dial_level }
            );
            if ( !updatedCampaign ) {
                // Handle the case where the campaign with the provided UUID is not found
                return { message: `Campaign with UUID ${uuid} not found.` };
            }
            Logger.debug( `Campaign dial level updated successfully for UUID ${uuid}` );
            Logger.debug( "Campaign dial level updated successfully. \n" );
            // return { message: 'Campaign dial level updated successfully.' };
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Campaign dial level updated successfully.` );

        } catch ( error ) {
            // Handle errors and return error response
            // console.error( error );
            // return { error: 'Failed to update campaign dial level.' };
            Logger.error( `Failed to update campaign dial level.`, error.message );
        }
    }
}

