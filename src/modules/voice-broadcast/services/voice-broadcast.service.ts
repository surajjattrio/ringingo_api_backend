import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { VoiceBroadcastDocument, VoiceBroadcastSchema } from "../schema/voice-broadcast.schema";
import { Model } from "mongoose";
import { CreateVoiceBroadcastDto } from "../dto/create-voice-broadcast.dto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { putMethod } from "src/global_constant";
import { VoiceBroadcastLeadGroupDto } from "../dto/voice-broadcast-lead-group.dto";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadBroadcastQueueDocument, LeadBroadcastQueueSchema } from "../schema/lead-broadcast-queue.schema";
import { MainBroadcastQueueDocument, MainBroadcastQueueSchema } from "../schema/main-broadcast-queue.schema";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { OutboundCampaignDialableStatus } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign-dialable-status";
import { StartBroadcastDto } from "../dto/start-broadcast.dto";
import { CronJob } from "cron";
import { CommonFunctions } from "src/modules/common/common_functions";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { CallerIdSchema, callerIdDocument } from "src/modules/caller-id-group/schema/caller-ids.schema";
import { DeleteLeadGroupDto } from "../dto/delete-lead-group.dto";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
@Injectable()

export class VoiceBroadcastService implements OnModuleInit {

    /*
    @Usage              : To load voice broadcast schema and other libraries
    @Param @InjectModel : It will load voice broadcast schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [voice_broadcast,commonDbFn]
    */

    private stoppedBroadcastList = [];
    private totalCallSent = [];
    private allBroadcastDatas = [];

    /*
    @Usage              : To start this function on server restart , we will fetch all broadcast's which was missed at the time of server down OR restart
    */

    async onModuleInit () {
        try {
            var currentDate: any = new Date();
            currentDate.setMinutes( currentDate.getMinutes() + 2 );
            currentDate = this.getFormattedDate( currentDate );
            let result = await this.voice_broadcast.find( { $and: [ { $or: [ { start_date: { $lte: this.commonFn.getTodayDate( true ) } } ] }, { $or: [ { broadcast_status: "1" }, { broadcast_status: "2" } ] } ] } ).exec();
            // let result = await this.voice_broadcast.find({ $and: [{ broadcast_status: "1" }, { start_date: { $lte: this.commonFn.getTodayDate(true) } }] });

            if ( result.length > 0 ) {
                Logger.verbose( `Found Total = ${result.length} missed cron job , all missed job will start after 2 minutes from current time` );
                let broadastData;

                //Start all missed cron job
                result.map( ( data ) => {
                    broadastData = {
                        // start_date: currentDate,
                        // end_date: data.end_date,
                        voice_broadcast_uuid: data.uuid,
                        tenant_uuid: data.tenant_uuid
                    }
                    this.updateBroadcastStatus( broadastData, "in-progress", currentDate );
                } );
            } else {
                Logger.verbose( `Not found any missed cron job` );
            }
        } catch ( error ) {
            Logger.error( `Error while module init`, error.message );
        }
    }

    constructor(
        @InjectModel( VoiceBroadcastSchema.name ) private readonly voice_broadcast: Model<VoiceBroadcastDocument>,
        @InjectModel( LeadManagementSchema.name ) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel( LeadBroadcastQueueSchema.name ) private readonly lead_broadcast_queue: Model<LeadBroadcastQueueDocument>,
        @InjectModel( MainBroadcastQueueSchema.name ) private readonly main_broadcast_queue: Model<MainBroadcastQueueDocument>,
        @InjectModel( LeadGroupSchema.name ) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel( OutboundCampaignDialableStatus.name ) private readonly outbound_campaign_diallable_status: Model<LeadGroupDocument>,
        @InjectModel( TrunkSchema.name ) private readonly trunk: Model<TrunkDocument>,
        @InjectModel( CallerIdSchema.name ) private readonly caller_ids: Model<callerIdDocument>,
        @InjectModel( DispositionSchema.name ) private readonly disposition: Model<DispositionDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,

    ) {

    }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new voice broadcast will be created else it will throw error
    @Param createConferenceDto : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createVoiceBroadcastDto: CreateVoiceBroadcastDto ) {
        const { name, tenant_uuid } = createVoiceBroadcastDto;
        let where = [ { name }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "Voice broadcast already exist \n",
            logSuccessMsg: "Voice broadcast created successfully \n"
        }
        let response = await this.commonDbFn.findAndInsert( this.voice_broadcast, where, createVoiceBroadcastDto, JSON.stringify( logMessages ), "and", true );
        if ( response.statusCode == 409 ) { return response; }

        // Add disposition NEW
        let disposition_uuid: any = await this.disposition.findOne( { name: "NEW" }, { disposition_uuid: 1, _id: 0 } ).exec();
        disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";

        let insertedUUID = response?.message?.uuid;

        let obj = { disposition_uuid, outbound_campaign_uuid: insertedUUID, tenant_uuid };
        let result = new this.outbound_campaign_diallable_status( obj );
        result = await result.save();
        Logger.debug( `Disposition with NEW created` );
        delete response.message;
        return response;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of voice broadcast with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "name", "caller_id" ];
        return this.commonDbFn.findAllWithPagination( this.voice_broadcast, queryParams, searchFields );
    }

    /*
    @Usage          : To get single voice broadcast record based on uuid
    @Param uuid     : Search voice broadcast by uuid
    @return Object  : Result of voice broadcast
    */

    async findOne ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Voice broadcast not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Voice broadcast success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne( this.voice_broadcast, uuid, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                             : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                        : uuid of voice broadcast
    @Param createVoiceBroadcastDto     : Request parameters for update
    @return Object                     : Success / Error
    */

    async update ( uuid: string, createVoiceBroadcastDto: CreateVoiceBroadcastDto ) {
        const { name, tenant_uuid, end_date } = createVoiceBroadcastDto;
        const getVoiceBroadcast: any = await this.voice_broadcast.findOne( { uuid } ).exec();
        if ( getVoiceBroadcast?.name != name ) {
            const checkVoiceBroadcastExist = await this.voice_broadcast.find( { $and: [ { name }, { tenant_uuid } ] } ).count().exec();
            if ( checkVoiceBroadcastExist > 0 ) {
                Logger.error( "Voice broadcast already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Voice broadcast already exist` );
            }
        }
        /*if (getVoiceBroadcast?.end_date != end_date) {
            Logger.warn(`End date of broadcast : ${uuid} has been changed \n`);
            this.endDatesOfBroadcasts.push({ broadcast_uuid: uuid, end_date });
        }*/

        // endDatesOfBroadcasts
        let logMessages = {
            logErrorMsg: `Voice broadcast not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Voice broadcast updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.voice_broadcast, uuid, createVoiceBroadcastDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search voice broadcast using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of voice broadcast with data
    */

    async advancedSearch ( searchParams ) {
        let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;

        //Check Role type
        let { role, tenant_uuid, uuid } = searchParams;
        if ( role == "tenant" ) {
            where.push( { tenant_uuid: tenant_uuid } );
        } else if ( role == "agent" ) {
            where.push( { user_uuid: uuid } );
        }

        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;

        if ( searchParams.broadcast_start != undefined && searchParams.broadcast_end != undefined ) {
            // obj = { start_date: { "$gte": `${searchParams.broadcast_start}` }, start_date: { "$lte": `${searchParams.broadcast_end}` } };
            obj = { "start_date": { "$gte": `${searchParams.broadcast_start}`, "$lte": `${searchParams.broadcast_end}` } };

            where.push( obj );
        }

        //Pagination
        const perPage = Number( searchParams.limit ) || 10;
        const currentPage = Number( searchParams.page ) || 1;
        const skip = perPage * ( currentPage - 1 );
        //End

        delete searchParams.broadcast_start;
        delete searchParams.broadcast_end;


        objectKeys = Object.keys( searchParams );
        objectValues = Object.values( searchParams );
        len = objectKeys.length;

        for ( i = 0; i < len; i++ ) {
            filedName = objectKeys[ i ];
            filedValue = objectValues[ i ];
            if ( filedName.includes( "|" ) ) {
                key = filedName.split( "|" )[ 0 ].trim();
                searchFlag = parseInt( filedName.split( "|" )[ 1 ].trim() );
            } else {
                key = filedName;
                searchFlag = -1;
            }

            switch ( searchFlag ) {
                case 1: //Begins with
                    obj = { [ key ]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push( obj );
                    break;
                case 2: // Contains
                    obj = { [ key ]: { $regex: filedValue, $options: "i" } };
                    where.push( obj );
                    break;
                case 3: // Does not contains
                    obj = { [ key ]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    where.push( obj );
                    break;
                case 4: // Is equal to
                    obj = { [ key ]: filedValue };
                    where.push( obj );
                    break;
                case 5: // In not equal to
                    obj = { [ key ]: { $ne: filedValue } };
                    where.push( obj );
                    break;
                case 6: //Ends with
                    obj = { [ key ]: { $regex: `${filedValue}$`, $options: "i" } };
                    where.push( obj );
                    break;

                default: //Begins with
                    obj = { [ key ]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push( obj );
                    break;
            }
        }

        if ( where.length == 0 ) {
            where = [ {} ];
        }
        result = await this.voice_broadcast.find( { $and: where } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).exec();

        if ( result.length > 0 ) {
            count = await this.voice_broadcast.find( { $and: where } ).count().exec();
            Logger.debug( count, "Search result count" );
            return this.commonDbFn.sendResponseWithCount( HttpStatus.OK, result, count )
        } else {
            Logger.error( count, "Search result count" );
            return this.commonDbFn.sendResponseWithCount( HttpStatus.NOT_FOUND, result, count )
        }
    }

    /*
    @Usage         : To update status of voice broadcast[Active/Inactive]
    @Param uuid    : uuid of voice broadcast
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Voice broadcast not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Voice broadcast status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.voice_broadcast, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple voice broadcast using uuid
    @Param uuid    : To delete single voice broadcast pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Voice broadcast not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Voice broadcast deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.voice_broadcast, { uuid }, JSON.stringify( logMessages ) );
    }

    /****************************** Lead Group Tab ************************************/

    /*
    @Usage                            : To reset leads
    @Param voiceBroadcastLeadGroupDto : Request DTO
    @return Object                    : Success / Error
    */

    async resetLeads ( voiceBroadcastLeadGroupDto: VoiceBroadcastLeadGroupDto ) {
        try {
            let allLeads;
            const { lead_group_uuid, tenant_uuid, voice_broadcast_uuid } = voiceBroadcastLeadGroupDto;

            //Delete old records of tenant if it exist
            let deleteLeads = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid } );

            if ( deleteLeads.deletedCount > 0 ) {
                Logger.debug( `Deleted total leads : ${deleteLeads.deletedCount} for lead group : ${lead_group_uuid} \n` );
            } else {
                Logger.error( `Unable to delete leads for lead group : ${lead_group_uuid}  REASON == Data not exist that satisy where condition \n` );
            }

            //Get leads of lead group
            let result = await this.lead_management.find( { lead_group_uuid, tenant_uuid, in_dnc: "1", campaign_uuid: voice_broadcast_uuid }, { lead_management_uuid: 1, lead_group_uuid: 1, lead_status: 1, _id: 0 } ).exec();

            if ( result ) {
                Logger.debug( `Fetched total leads : ${result.length} from lead group : ${lead_group_uuid} \n` );
            } else {
                Logger.error( `Unable to fetched leads from lead group : ${lead_group_uuid} \n` );
            }

            //check lead_status exist or not
            allLeads = await this.addAllLeadsInQueue( result, tenant_uuid, voice_broadcast_uuid );
            let obj = {}, allLeadsArr = [], count = 0;


            allLeads.map( ( data ) => {
                if ( data != undefined ) {
                    count++;
                    obj = { lead_management_uuid: data.lead_management_uuid, tenant_uuid, count, lead_group_uuid: data.lead_group_uuid };
                    allLeadsArr.push( obj );
                }
            } );
            Logger.debug( `Total matched disposition in diallable === count : ${allLeadsArr.length} \n` );
            //Add all leads of lead group
            await this.lead_broadcast_queue.insertMany( allLeadsArr );
            Logger.debug( `Added total leads in lead broadcast queue: ${allLeadsArr.length} for lead group : ${lead_group_uuid} \n` );

            //Take 100 leads from lead_broadcast_queue
            let fetchLeads = await this.lead_broadcast_queue.find( { tenant_uuid, lead_group_uuid } ).limit( 100 ).exec();
            if ( fetchLeads.length > 0 ) {
                Logger.debug( `Fetched 100 leads from lead broadcast queue , so deleting 100 records from lead broadcast queue \n` );

                //Add 100 records
                let deleteLeads = await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid } );

                if ( deleteLeads.deletedCount > 0 ) {
                    Logger.debug( `Deleted total leads : ${deleteLeads.deletedCount} from main broadcast for lead group : ${lead_group_uuid} \n` );
                } else {
                    Logger.error( `Unable to delete leads from main broadcast for lead group : ${lead_group_uuid} REASON == Data not exist that satisy where condition\n` );
                }

                await this.main_broadcast_queue.insertMany( fetchLeads, { ordered: false } );

                let lastElement: any = fetchLeads[ fetchLeads.length - 1 ];
                lastElement = lastElement.count;
                let result = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid, count: { "$lte": lastElement } } );
                Logger.debug( `Deleted leads count from lead broadcast ===== count : ${result.deletedCount} \n` );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Lead reset successfully` );
            } else {
                Logger.error( `Unable to fetch 100 leads for lead broadcast queue with tenant : ${tenant_uuid} \n` );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Unable to reset lead` );
            }

        } catch ( error ) {
            Logger.error( `Error in fetching lead ==== Catch block \n`, error.message );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.BAD_REQUEST, `Error in fetching lead` );
        }
    }

    /*
    @Usage                  : Get lead group based on outbound campaign uuid
    @Param campaign_uuid    : Campaign uuid
    @return Object          : Success / Error
    */

    async getLeads ( queryParams, campaign_uuid: string ) {
        let checkRole: any = {}, result, totalCount = 0, leadTabData: any;
        const perPage = Number( queryParams.limit ) || 10;
        const currentPage = Number( queryParams.page ) || 1;
        const skip = perPage * ( currentPage - 1 );

        //Check role type
        let { role, tenant_uuid } = queryParams;
        if ( role == "tenant" ) {
            checkRole = { campaign_uuid, tenant_uuid };
        }

        result = await this.lead_group.find( { $and: [ checkRole ] }, { uuid: 1, _id: 0, name: 1, status: 1 } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).exec();

        //Do query for count only when result greater than 0
        if ( result.length > 0 ) {
            totalCount = await this.lead_group.find( { $and: [ checkRole ] } ).count().exec();
            //Get total count & queue count for each lead group
            leadTabData = await this.getVoiceBroadcastTotalAndQueueCountByLeadGroup( result );
        } else {
            leadTabData = [];
        }


        return this.commonDbFn.sendResponseWithCount( result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, leadTabData, totalCount );
    }

    /*
    @Usage               : To get queue count and total count of leads for each lead group
    @Param  result       : Lead groups data
    @return Object       : Queue details with lead group
    */

    // @OnEvent('lead_import_count')
    // countLeadImport(payload) {
    //     this.totalLeadImportCount = payload;
    // }

    async getVoiceBroadcastTotalAndQueueCountByLeadGroup ( result ) {

        let allData;
        let self = this;
        return new Promise( async function ( resolve ) {
            allData = result.map( async ( data ) => {
                return {
                    name: data.name,
                    queueCount: await self.lead_broadcast_queue.find( { $and: [ { lead_group_uuid: data.uuid } ] } ).count().exec(),
                    hopperCount: await self.main_broadcast_queue.find( { $and: [ { lead_group_uuid: data.uuid } ] } ).count().exec(),
                    totalCount: await self.lead_management.find( { $and: [ { lead_group_uuid: data.uuid } ] } ).count().exec(),
                    status: data.status,
                    uuid: data.uuid
                }
            } );
            result = await Promise.all( allData );
            resolve( result );
        } );
    }

    /*
    @Usage               : To add all leads in leads_in_queue collection for given lead group
    @Param  result       : Lead groups data
    @return Array        : Array to return to client
    */

    async addAllLeadsInQueue ( result, tenant_uuid, campaign_uuid ) {

        let allData;
        let self = this;
        return new Promise( async function ( resolve, reject ) {
            allData = result.map( async ( data ) => {
                let result = await self.outbound_campaign_diallable_status.find( { $and: [ { $or: [ { tenant_uuid }, { outbound_campaign_uuid: campaign_uuid } ] }, { $and: [ { outbound_campaign_uuid: campaign_uuid }, { $or: [ { disposition_uuid: data.lead_status }, { outbound_campaign_disposition_uuid: data.lead_status } ] } ] } ] } ).count().exec();
                if ( result > 0 ) {
                    data.lead_management_uuid = data.lead_management_uuid;
                    data.lead_group_uuid = data.lead_group_uuid;
                    await self.lead_management.updateOne({lead_management_uuid:data.lead_management_uuid},{$set:{retries_count:0}}).exec();
                    return data;
                }
            } );
            result = await Promise.all( allData );
            resolve( result );
        } );
    }

    /*************************** VOICE BROADCAST CRON JOBS **************************************/


    async updateBroadcastStatus ( startBroadcastDto: StartBroadcastDto, action, currentDate: any = "" ) {
        try {
            const { voice_broadcast_uuid, tenant_uuid } = startBroadcastDto;
            /*let broadcast_status = action == "in-progress" ? "1" : "3";
            let response = await this.voice_broadcast.updateOne({ uuid: voice_broadcast_uuid }, { broadcast_status }, { $upsert: true }).exec();

            if (response.modifiedCount > 0) {
                Logger.debug(`Broadcast status of : ${voice_broadcast_uuid} set to === ${broadcast_status}: ${action.toUpperCase()} \n`);
            } else {
                Logger.error(`Unable to update broadcast status of : ${voice_broadcast_uuid} \n`);
            }*/

            //Update cron status
            let populateFileds = [ { path: "outgoing_rules", select: "rules" } ];
            let voiceBroadcastData: any = await this.voice_broadcast.findOne( { uuid: voice_broadcast_uuid } ).populate( populateFileds ).exec();
            let { channel, caller_id, start_date, end_date, amd, caller_id_type,skip }: any = voiceBroadcastData;

            start_date = currentDate != "" ? currentDate : start_date;
            //this.commonFn.getTodayDate(true) > start_date &&
            if ( this.commonFn.getTodayDate( true ) < end_date ) {
                let addTwoMinutesInCurrentDate = new Date();
                addTwoMinutesInCurrentDate.setMinutes( addTwoMinutesInCurrentDate.getMinutes() + 1 );
                start_date = this.getFormattedDate( addTwoMinutesInCurrentDate );
                Logger.warn( `Broadcast was stopped in between, so it will start on current date time on action of start button again ==> NEW START DATE : ${start_date}\n` );
            } else {
                Logger.error( `End date time has been passed , no calls will initiate with broadcast : ${voice_broadcast_uuid}` );
                this.updateBroadCastFlag( voice_broadcast_uuid, "3" );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.BAD_REQUEST, `Broadcast end date time should be any future date` );
            }

            let rules = await this.getRulesWithTrunk( voiceBroadcastData.outgoing_rules[ 0 ].rules );
            Logger.warn( `RULES`, rules );

            //Update cron status
            let broadcast_status = action == "in-progress" ? "1" : "3";
            await this.updateBroadCastFlag( voice_broadcast_uuid, broadcast_status );
            /*let response = await this.voice_broadcast.updateOne({ uuid: voice_broadcast_uuid }, { broadcast_status }, { $upsert: true }).exec();

            if (response.modifiedCount > 0) {
                Logger.debug(`Broadcast status of : ${voice_broadcast_uuid} set to === ${broadcast_status}: ${action.toUpperCase()} \n`);
            } else {
                Logger.error(`Unable to update broadcast status of : ${voice_broadcast_uuid} \n`);
            }*/

            this.updateCronStatus( start_date, end_date, voice_broadcast_uuid, action, tenant_uuid, channel, caller_id, rules, amd, caller_id_type,skip );
        } catch ( error ) {
            Logger.error( `Error in catch block \n`, error.message );
        }
    }

    /*
    @Usage               : To check main broadcast collection empty , then add leads from lead broadcast
    @Param  execute time : Every 1 hour
    @return Object       : Success / Error
    */

    async updateCronStatus ( startDate, endDate, voiceBroadcastUUID, action, tenant_uuid, channel, caller_id, outgoingRulesDetails, amd, caller_id_type,skip ) {
        try {
            if ( action == "in-progress" ) {
                //Create dynamic cron job here
                const job = new CronJob( new Date( startDate ), async () => {
                    Logger.debug( `Voice broadcast with uuid : ${voiceBroadcastUUID} has been started at ${startDate} \n`, new Date() );
                    await this.updateBroadCastFlag( voiceBroadcastUUID, "2" );
                    /*let response = await this.voice_broadcast.updateOne({ uuid: voiceBroadcastUUID }, { broadcast_status: "2" }, { $upsert: true }).exec();

                    if (response.modifiedCount > 0) {
                        Logger.debug(`Broadcast status of : ${voiceBroadcastUUID} set to == 2 : RUNNNIG \n`);
                    } else {
                        Logger.error(`Unable to update broadcast status of : ${voiceBroadcastUUID} \n`);
                    }*/
                    this.initiateBroadcastCalls( voiceBroadcastUUID, tenant_uuid, endDate, channel, caller_id, outgoingRulesDetails, amd, caller_id_type ,skip);
                } );
                job.start();
                Logger.verbose( `Broadcast : ${voiceBroadcastUUID} has been scheduled at : ${startDate}  with end date : ${endDate}` );
            } else {
                if ( this.stoppedBroadcastList.includes( voiceBroadcastUUID ) == false ) {
                    this.stoppedBroadcastList.push( voiceBroadcastUUID );
                }
                Logger.warn( `Stopped Broadcast List :${JSON.stringify( this.stoppedBroadcastList )} \n` );
            }
        } catch ( error ) {
            Logger.error( `Error in catch block === updateCronStatus()`, error.message );
        }
    }

    /*
    @Usage           : To wait for defined seconds before sending next call
    @Param  ms       : in seconds how many seconds want to wait
    @Param  Promise
    */

    sleep = ms => new Promise( resolve => setTimeout( resolve, ms ) );

    /*
    @Usage                      : To start voice broadcast
    @Param  voiceBroadcastUUID  : uuid of voice broadcast
    @Param  tenant_uuid         : uuid of tenant
    @return Object              : Success / Error
    */

    async initiateBroadcastCalls ( voiceBroadcastUUID, tenant_uuid, endDate, channel, caller_id, outgoingRulesDetails, amd, caller_id_type,skip ) {
        try {
            let leadgroupData = await this.lead_group.findOne( { campaign_uuid: voiceBroadcastUUID }, { uuid: 1, _id: 0 } ).exec();

            const { uuid } = leadgroupData;

            let delayValue = Math.floor( 60 / channel );
            delayValue = delayValue * 1000;
            Logger.debug( `BroadcastUUID : ${voiceBroadcastUUID} Sending calls with delay : ${delayValue / 1000} SECONDS \n` );

            Logger.verbose( `Voice broadcasting started successfully...... : BroadcastUUID : ${voiceBroadcastUUID} \n` );
            this.startSendingCalls( channel, delayValue, endDate, tenant_uuid, voiceBroadcastUUID, caller_id, uuid, outgoingRulesDetails, amd, caller_id_type,skip );
        } catch ( error ) {
            Logger.error( `Error in catch block`, error.message );
        }
    }

    /*
    @Usage                      : To start voice broadcast
    @Param  channel             : calls count
    @Param  delayValue          : delay value after each call
    @Param  end_schedule        : end date of voice broadcast
    @Param  tenant_uuid         : uuid of tenant
    @Param  voiceBroadcastUUID  : uuid of voice broadcast
    @Param  caller_id           : caller_id
    @return Object              : Success / Error
    */

    async startSendingCalls ( channel, delayValue, end_date, tenant_uuid, voiceBroadcastUUID, caller_id, lead_group_uuid, outgoingRulesDetails, amd, caller_id_type,skip ) {
        let mainBroadcastData, trunkDetails: any, deleteLeads = [], leadNumber, leadDetails;
        let currentDateTime = this.commonFn.getTodayDate( true );
        let tenant_details = await this.tenant.findOne( { tenant_uuid } ).select( "account_code,domain" ).exec();
        console.log( "accountcode" );
        console.log( tenant_details );
        let account_code,tenant_domain;
        if ( tenant_details != null ) {
            account_code = tenant_details.account_code;
            tenant_domain = tenant_details.domain;
        }
        console.log( 'accountcode ============>', account_code );
        Logger.log( `CurrentDateTime : ${currentDateTime} & BroadcastEndTime : ${end_date} \n` );
	// Convert strings → Date
        const now = new Date(currentDateTime.replace(' ', 'T'));
        const end = new Date(end_date.replace(' ', 'T'));
        // Extract IST hour
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();
        const isWithinTimeWindow = nowMinutes < endMinutes;

        try {
            if ( now < end && isWithinTimeWindow) {
            // if ( end_date > currentDateTime ) {

                if ( this.allBroadcastDatas[ voiceBroadcastUUID ] == undefined || this.allBroadcastDatas[ voiceBroadcastUUID ].length == 0 ) {
                    let populateFields = [ { path: "lead_details", select: "-_id first_name last_name phone_number custom_phone_number lead_management_uuid" } ];
                    mainBroadcastData = await this.main_broadcast_queue.find( { tenant_uuid, lead_group_uuid } ).populate( populateFields ).limit( 100 ).exec();

                    if ( mainBroadcastData.length == 0 ) {
                        Logger.warn( `No data found in main broadcast, fetching from lead broadcast \n` );
                        mainBroadcastData = await this.fetchNext100Leads( tenant_uuid, lead_group_uuid );
                        if ( mainBroadcastData == null ) {
                            Logger.error( `No data found in lead broadcast ==> lead_group_uuid : ${lead_group_uuid} & tenant_uuid : ${tenant_uuid} , so broadcast : ${voiceBroadcastUUID} has been ended!! \n` );
                            /*let response = await this.voice_broadcast.updateOne({ uuid: voiceBroadcastUUID }, { broadcast_status: "3" }, { $upsert: true }).exec();

                            if (response.modifiedCount > 0) {
                                Logger.debug(`Broadcast status of : ${voiceBroadcastUUID} set to == 3 : STOP \n`);
                            } else {
                                Logger.error(`Unable to update broadcast status of : ${voiceBroadcastUUID} \n`);
                            }*/
                            await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                            return;
                        }
                    }
                    this.allBroadcastDatas[ voiceBroadcastUUID ] = mainBroadcastData;
                }

                for ( let i = 0; i < channel; i++ ) {
                    try {

                        //Send caller id
			let new_caller_id;
                        if ( caller_id_type != null) {
                            new_caller_id = await this.getCallerID( caller_id_type, caller_id, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.phone_number );
                            // new_caller_id = await this.getCallerID( caller_id_type, caller_id, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.custom_phone_number );
                        }
console.log("this.allBroadcastDatas[ voiceBroadcastUUID ]",this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details);

                        if ( this.allBroadcastDatas[ voiceBroadcastUUID ].length > 0 ) {
                            trunkDetails = await this.getTrunkUUID( outgoingRulesDetails, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.phone_number );
                            // trunkDetails = await this.getTrunkUUID( outgoingRulesDetails, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.custom_phone_number );
                            leadNumber = trunkDetails.lead_number;
                            Logger.warn( `Trunk Details`, JSON.stringify( trunkDetails ) );
                        }

                        //Check if any required param is missing for generating call
                        if ( trunkDetails == undefined || trunkDetails.trunkName == "" || trunkDetails.trunkName == undefined || new_caller_id == undefined || this.allBroadcastDatas[ voiceBroadcastUUID ].length == 0 ) {

                            //Remove lead from array if no data found for that broadcast array
                            if ( this.allBroadcastDatas[ voiceBroadcastUUID ].length > 0 ) {
                                deleteLeads.push( this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].uuid );
                                this.allBroadcastDatas[ voiceBroadcastUUID ].splice( 0, 1 );
                            }
                            await this.sleep( delayValue );
                            continue;
                        }

                        leadDetails = {
                            first_name: this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].lead_details[ 0 ].first_name,
                            last_name: this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].lead_details[ 0 ].last_name,
                            phone_number: leadNumber,
                            lead_management_uuid: this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].lead_details[ 0 ].lead_management_uuid
                        }
                        this.commonFn.getUUIDForCall( voiceBroadcastUUID, tenant_uuid, "", leadDetails, new_caller_id, trunkDetails.trunkName, "30", "", "1", "", amd, "broadcast", "", tenant_domain, account_code ,"",skip);

                        //console.log(`Sent call ${i} broadcast : ${voiceBroadcastUUID} LEAD : ${this.allBroadcastDatas[voiceBroadcastUUID][0].lead_details[0]}`);


                    } catch ( error ) {
                        Logger.error( `Error in catch block when sending calls`, error.message );
                    }
                    deleteLeads.push( this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].uuid );
                    this.allBroadcastDatas[ voiceBroadcastUUID ].splice( 0, 1 );
                    await this.sleep( delayValue );
                }

                //Push all sent calls from particular broadcast
                let data = this.totalCallSent.find( x => x.broadcastUUID == voiceBroadcastUUID );
                if ( data ) {
                    data.count = parseInt( data.count ) + channel;
                } else {
                    this.totalCallSent.push( {
                        count: deleteLeads.length,
                        broadcastUUID: voiceBroadcastUUID
                    } );
                }

                /*this.totalCallSent.push({
                            count: deleteLeads.length,
                            broadcastUUID: voiceBroadcastUUID
                        });*/

                Logger.log( `COUNT_DETAILS`, this.totalCallSent );
                //Delete lead from main_broadcast_queue
                await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid, uuid: { $in: deleteLeads } } );
                Logger.verbose( `${channel} calls sent successfully with delay of : ${delayValue / 1000} seconds , sending next ${channel} calls if & only if broadcast status not equal to STOP or broadcast not ended \n` );

                let broadcastStatus = await this.checkBroadcastStatus( voiceBroadcastUUID );
                //Do next calls if broadcast not reached to end date
                if ( broadcastStatus == true ) { //Stop sending calls
                     Logger.warn( `Original end date time of broadcast : ${voiceBroadcastUUID} was ${end_date} , but due to stop action , no new calls will initiate from next minutes \n` );
                     end_date = this.commonFn.getTodayDate( true );
                }

                //Check end date of broadcast has been changed or not.
                /*let broadcastEndDates = this.endDatesOfBroadcasts.filter(function (el) {
                    return el.broadcast_uuid == voiceBroadcastUUID;
                });

                if (broadcastEndDates.length > 0) {
                    Logger.warn(`Found end date has been changed broadcast : ${voiceBroadcastUUID} so changing end date FROM : ${end_date} TO ${broadcastEndDates[0].end_date} \n`);
                    end_date = broadcastEndDates[0].end_date;
                }*/

                this.startSendingCalls( channel, delayValue, end_date, tenant_uuid, voiceBroadcastUUID, caller_id, lead_group_uuid, outgoingRulesDetails, amd, caller_id_type,skip );
            } else {
                let broadcastStatus = await this.checkBroadcastStatus( voiceBroadcastUUID );
                let index = this.stoppedBroadcastList.indexOf( voiceBroadcastUUID );
                this.stoppedBroadcastList.splice( index, 1 );
                let text = broadcastStatus == true ? "stopped" : "ended";

                Logger.warn( `Broadcast with uuid : ${voiceBroadcastUUID} has been ${text} , so no more calls will initiate from this broadcast \n` );
                await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                /* let response = await this.voice_broadcast.updateOne({ uuid: voiceBroadcastUUID }, { broadcast_status: "3" }, { $upsert: true }).exec();

                 if (response.modifiedCount > 0) {
                     Logger.debug(`Broadcast status of : ${voiceBroadcastUUID} set to === 3: STOP \n`);
                 } else {
                     Logger.error(`Unable to update broadcast status of : ${voiceBroadcastUUID} \n`);
                 } */


            }
        } catch ( error ) {
            Logger.error( `Error in catch block ==== startSendingCalls()`, error.message );
        }
    }

    async checkBroadcastStatus ( voiceBroadcastUUID ) {
        return new Promise( ( resolve ) => {
            if ( this.stoppedBroadcastList.includes( voiceBroadcastUUID ) == true ) {
                resolve( true );
            } else {
                resolve( false );
            }
        } )
    }

    /*
    @Usage                      : To fetch next 100 leads from lead broadcast, if no more lead found in main broadcast
    @Param  tenant_uuid         : uuid of tenant
    @return Object              : Success / Error
    */

    async fetchNext100Leads ( tenant_uuid, lead_group_uuid ) {
        let populateFields = [ { path: "lead_details", select: "-_id first_name last_name phone_number custom_phone_number lead_management_uuid" } ];
        let fetchLeads = await this.lead_broadcast_queue.find( { tenant_uuid, lead_group_uuid } ).limit( 100 ).exec();
        if ( fetchLeads.length > 0 ) {
            Logger.debug( `Fetched 100 leads from lead broadcast queue , so deleting 100 records from lead broadcast queue \n` );

            await this.main_broadcast_queue.insertMany( fetchLeads, { ordered: false } );

            let lastElement: any = fetchLeads[ fetchLeads.length - 1 ];
            lastElement = lastElement.count;
            let result = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid, count: { "$lte": lastElement } } );
            Logger.debug( `Deleted leads from lead broadcast ===== count : ${result.deletedCount} \n` );
            Logger.log( `Next 100 leads fetched successfully` );
            let final_leads = await this.main_broadcast_queue.find( { tenant_uuid, lead_group_uuid } ).populate( populateFields ).limit( 100 ).exec();
            return final_leads;
        } else {
            Logger.error( `Unable to fetch 100 leads for lead broadcast queue with tenant : ${tenant_uuid} \n` );
            return null;
        }
    }

    /*
    @Usage            : To get date time in Y-m-d h:i:s format
    @Param  date      : date which we need in above format
    @return string
    */

    getFormattedDate ( date ) {
        let dateTime = date;
        date = dateTime.getDate();
        date = date < 10 ? `0${date}` : date;

        let month = dateTime.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;

        let year = dateTime.getFullYear();

        let hour = dateTime.getHours();
        hour = hour < 10 ? `0${hour}` : hour;

        let minutes = dateTime.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;

        let seconds = dateTime.getSeconds();
        seconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${year}-${month}-${date} ${hour}:${minutes}:${seconds}`;

    }

    /*
   @Usage            : To get date time in Y-m-d h:i:s format
   @Param  date      : date which we need in above format
   @return string
   */

    async getTrunkUUID ( rules, lead_number ) {
        let i, length, prefix, prefixLen, leadNumberLength, getLengthBasedOnPrefix, trunkUUID, strip, stripLen, prepend, leadNumberAfterExtract, trunkDetails: any = {};
        let rulesLength = rules?.length;
        if ( rules.length != 0 && lead_number != "" ) {
            for ( i = 0; i < rulesLength; i++ ) {
                length = parseInt( rules[ i ]?.length );
                prefix = rules[ i ]?.prefix;
                prefixLen = parseInt( prefix?.length );
                leadNumberLength = lead_number?.length;

                getLengthBasedOnPrefix = lead_number?.slice( 0, prefixLen );
                if ( getLengthBasedOnPrefix == prefix && length == 0 ) {
                    trunkUUID = rules[ i ];
                    break;
                } else if ( getLengthBasedOnPrefix == prefix && length != 0 ) {
                    if ( leadNumberLength?.toString() == length?.toString() ) {
                        trunkUUID = rules[ i ];
                        break;
                    }
                } else if ( prefix == "*" && length == 0 ) {
                    trunkUUID = rules[ i ];
                    break;
                } else { // comes in else when prefix = * and length != 0
                    if ( leadNumberLength?.toString() == length?.toString() ) {
                        trunkUUID = rules[ i ];
                        break;
                    }
                }
            }
            trunkDetails.trunkName = trunkUUID.trunkName;

            //Check for strip & prepend
            strip = trunkUUID?.strip;
            prepend = trunkUUID?.prepend;
            if ( strip != "" && strip != undefined ) {
                stripLen = strip.length;
                leadNumberAfterExtract = lead_number.slice( 0, stripLen );
                if ( leadNumberAfterExtract == strip ) {
                    lead_number = lead_number.slice( stripLen );
                }
            }
            if ( prepend != "" ) {
                lead_number = prepend.concat( lead_number );
            }
            return { lead_number, trunkName: trunkDetails.trunkName }
        }
    }

    /*
    @Usage            : To get date time in Y-m-d h:i:s format
    @Param  date      : date which we need in above format
    @return Array     : Array of an object containing trunk information
    */

    async getRulesWithTrunk ( rules ) {
        return new Promise( async ( resolve, reject ) => {
            let trunkName, rulesArr = [], allData, obj = {};
            allData = rules?.map( async ( data ) => {

                trunkName = await this.trunk.findOne( { uuid: data.trunk_uuid }, { name: 1, _id: 0 } ).exec();
                obj = {
                    length: data.length,
                    prefix: data.prefix,
                    strip: data.strip,
                    prepend: data.prepend,
                    trunk_uuid: data.trunk_uuid,
                    trunkName: trunkName?.name,
                    failover_trunk_1_uuid: data.failover_trunk_2_uuid,
                    failover_trunk_2_uuid: data.failover_trunk_2_uuid
                }
                rulesArr.push( obj );
            } );
            await Promise.all( allData );
            resolve( rulesArr );
        } )
    }

    /*
    @Usage                 : To update agent status
    @Param campaignData    : Detail of call_id_type & call_id_value
    @Param lead_number     : lead number
    @return String         : Value of caller id
    */

    async getCallerID ( call_id_type, call_id_value, lead_number = "" ) {
        let result;
        switch ( call_id_type ) {
            case "0":
                result = call_id_value;
                break;
            case "1":
                result = await this.caller_ids.aggregate( [
                    {
                        $match: { caller_id_group_uuid: call_id_value }
                    },
                    {
                        $sample: { size: 1 }
                    },
                    {
                        $project: { caller_id: 1, _id: 0 }
                    }
                ] );
                if ( result != null ) {
                    result = result[ 0 ]?.caller_id;
                }
                break;
            case "2":
                break;
            case "3":
                result = await this.caller_ids.find( { caller_id_group_uuid: call_id_value } );

                if ( result != null ) {
                    let numberLength = lead_number.length;
                    let callerIdsLength = result.length;
                    let obj, i, j, res, finalCallerId = [], leadNumber: any = "0";
                    for ( i = 0; i < callerIdsLength; i++ ) {
                        for ( j = 0; j < numberLength; j++ ) {
                            leadNumber = lead_number.substr( 0, j );
                            if ( leadNumber == "" ) {
                                leadNumber = 0;
                            }
                            res = result[ i ].caller_id.startsWith( leadNumber );
                            if ( res ) {
                                obj = { count: j, caller_id: result[ i ].caller_id };
                                finalCallerId.push( obj );
                            }
                        }
                    }

                    //Remove duplicates
                    const uniqueIds = [];
                    const unique = finalCallerId.filter( element => {
                        const isDuplicateCount = uniqueIds.includes( element.count );
                        const isDuplicateCallerID = uniqueIds.includes( element.caller_id );

                        if ( !isDuplicateCount && !isDuplicateCallerID ) {
                            uniqueIds.push( element.id );
                            return true;
                        }
                        return false;
                    } );
                    let newResult = unique.sort( ( a, b ) => Number( b.count ) - Number( a.count ) );
                    result = newResult[ 0 ]?.caller_id;
                } else {
                    result = await this.caller_ids.aggregate( [
                        {
                            $match: { caller_id_group_uuid: call_id_value }
                        },
                        {
                            $sample: { size: 1 }
                        },
                        {
                            $project: { caller_id: 1, _id: 0 }
                        }
                    ] );
                    if ( result != null ) {
                        result = result[ 0 ]?.caller_id;
                    }

                }
                break;
        }
        return result;
    }


    /*
    @Usage         : To check how many calls done till yet from particular broadcast
    @Method        : GET
    @return Object : Success / Error
    */

    fetchCount ( startBroadcastDto: StartBroadcastDto ) {
        let count;
        const { voice_broadcast_uuid } = startBroadcastDto;
        let totalCallSent = this.totalCallSent.filter( function ( el ) {
            return el.broadcastUUID == voice_broadcast_uuid;
        } );
        if ( totalCallSent.length > 0 ) {
            count = totalCallSent[ 0 ]?.count;
        } else {
            count = 0;
        }
        Logger.log( `Total calls sent with broadcast : ${voice_broadcast_uuid} ==> ${totalCallSent[ 0 ]?.count}` );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, count );
    }

    /*
    @Usage               : To delete lead group from campaign
    @Param resetLeadDto  : Request DTO
    @return string       : Lead group deleted updated successfully from campaign
    */

    async removeLeadGroup ( deleteLeadGroupDto: DeleteLeadGroupDto ) {
        const { lead_group_uuid, tenant_uuid, campaign_uuid } = deleteLeadGroupDto;
        try {
            let response = await this.lead_group.updateOne( { uuid: lead_group_uuid, tenant_uuid, campaign_uuid }, { campaign_uuid: "" } );
            let result = await this.lead_broadcast_queue.deleteMany( { campaign_uuid, lead_group_uuid } ).exec();
            if ( result.deletedCount > 0 ) {
                Logger.debug( `Deleted leads with lead_group : ${lead_group_uuid} & campaign : ${campaign_uuid} == Total count : ${result.deletedCount}` );
            }
            if ( response.modifiedCount > 0 ) {
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Lead group deleted successfully from campaign" );
            } else {
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "Unable to delete lead group" );
            }
        } catch ( error ) {
            Logger.error( "Unable to delete lead group", error.message );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "Unable to delete lead group" );
        }
    }

    /*
    @Usage                       : To update broadcast flag
    @Param voice_broadcast_uuid  : uuid of voice broadcast
    @Param broadcast_status      : current status of broadcast[1/2/3]
    */

    async updateBroadCastFlag ( voice_broadcast_uuid, broadcast_status ) {
        let response = await this.voice_broadcast.updateOne( { uuid: voice_broadcast_uuid }, { broadcast_status }, { $upsert: true } ).exec();

        if ( response.modifiedCount > 0 ) {
            let action;
            switch ( broadcast_status ) {
                case "1":
                    action = "IN-PROGRESS"
                    break;
                case "2":
                    action = "RUNNING"
                    break;
                case "3":
                    action = "STOP"
                    break;
            }
            Logger.debug( `Broadcast status of : ${voice_broadcast_uuid} set to === ${action}\n` );
        } else {
            Logger.error( `Unable to update broadcast status of : ${voice_broadcast_uuid} \n` );
        }
    }
}
