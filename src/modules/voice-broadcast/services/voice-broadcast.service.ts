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
import { VoiceBroadcastLoggerService } from "./voice-broadcast-logger.service";
import { isCliRoute, nextCliRouteRoundRobin, resolveCliRoute } from "src/modules/outgoing-rules/utils/cli-route";
import { getVoiceBroadcastLogContext, runWithVoiceBroadcastLogContext } from "../utils/voice-broadcast-log-context";
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
    // CLI based outgoing rule of running broadcast (route_type = "cli"), keyed by voice broadcast uuid
    private vbCliRules = {};

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
        } catch ( error: any ) {
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
        private readonly vbLogger: VoiceBroadcastLoggerService,

    ) {

    }

    getLeadGroupUuids ( leadGroupUuidProp: any ): string[] {
        if ( !leadGroupUuidProp ) return [];
        if ( Array.isArray( leadGroupUuidProp ) ) return leadGroupUuidProp.map( s => String( s ).trim() ).filter( Boolean );
        if ( typeof leadGroupUuidProp === 'string' ) {
            if ( leadGroupUuidProp.includes( ',' ) ) {
                return leadGroupUuidProp.split( ',' ).map( s => s.trim() ).filter( Boolean );
            }
            return [ leadGroupUuidProp.trim() ].filter( Boolean );
        }
        return [];
    }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new voice broadcast will be created else it will throw error
    @Param createConferenceDto : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createVoiceBroadcastDto: CreateVoiceBroadcastDto ) {
        const { name, tenant_uuid, lead_group_uuid } = createVoiceBroadcastDto;
        let where = [ { name }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "Voice broadcast already exist \n",
            logSuccessMsg: "Voice broadcast created successfully \n"
        }
        let response = await this.commonDbFn.findAndInsert( this.voice_broadcast, where, createVoiceBroadcastDto, JSON.stringify( logMessages ), "and", true );
        if ( response.statusCode == 409 ) { return response; }

        let insertedUUID = response?.message?.uuid;

        const lgUuids = this.getLeadGroupUuids( lead_group_uuid );
        if ( lgUuids.length > 0 && insertedUUID ) {
            await this.lead_group.updateMany( { uuid: { $in: lgUuids }, tenant_uuid }, { campaign_uuid: insertedUUID } );
            await this.lead_management.updateMany( { lead_group_uuid: { $in: lgUuids }, tenant_uuid }, { campaign_uuid: insertedUUID } );
            await this.ensureQueuePopulatedForAllLeadGroups( insertedUUID, tenant_uuid, lgUuids );
        }

        // Add disposition NEW
        let disposition_uuid: any = await this.disposition.findOne( { name: "NEW" }, { disposition_uuid: 1, _id: 0 } ).exec();
        disposition_uuid = disposition_uuid?.disposition_uuid != null ? disposition_uuid?.disposition_uuid : "";

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
        const { name, tenant_uuid, end_date, lead_group_uuid } = createVoiceBroadcastDto;
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

        if ( lead_group_uuid !== undefined ) {
            const lgUuids = this.getLeadGroupUuids( lead_group_uuid );
            await this.lead_group.updateMany( { campaign_uuid: uuid, uuid: { $nin: lgUuids }, tenant_uuid }, { campaign_uuid: "" } );
            await this.lead_management.updateMany( { campaign_uuid: uuid, lead_group_uuid: { $nin: lgUuids }, tenant_uuid }, { campaign_uuid: "" } );
            if ( lgUuids.length > 0 ) {
                await this.lead_group.updateMany( { uuid: { $in: lgUuids }, tenant_uuid }, { campaign_uuid: uuid } );
                await this.lead_management.updateMany( { lead_group_uuid: { $in: lgUuids }, tenant_uuid }, { campaign_uuid: uuid } );
                await this.ensureQueuePopulatedForAllLeadGroups( uuid, tenant_uuid, lgUuids );
            }
        }

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
        const { tenant_uuid, voice_broadcast_uuid } = voiceBroadcastLeadGroupDto;
        return runWithVoiceBroadcastLogContext( { tenant_uuid, voice_broadcast_uuid }, () => this.resetLeadsImpl( voiceBroadcastLeadGroupDto ) );
    }

    private async resetLeadsImpl ( voiceBroadcastLeadGroupDto: VoiceBroadcastLeadGroupDto ) {
        try {
            const { lead_group_uuid, tenant_uuid, voice_broadcast_uuid } = voiceBroadcastLeadGroupDto;
            const lgUuids = this.getLeadGroupUuids( lead_group_uuid );
            let lgQuery: any = lgUuids.length > 1 ? { $in: lgUuids } : ( lgUuids[ 0 ] || lead_group_uuid );

            this.vbLogger.info( "reset_leads.started", `Reset-leads triggered for lead group(s) : ${lgUuids.join( ', ' )}`, { lead_group_uuid: lgUuids } );

            //Delete old records of tenant if it exist
            let deleteLeads = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery } );

            if ( deleteLeads.deletedCount > 0 ) {
                Logger.debug( `Deleted total leads : ${deleteLeads.deletedCount} for lead group(s) : ${lgUuids.join( ', ' )} \n` );
            } else {
                Logger.error( `Unable to delete leads for lead group(s) : ${lgUuids.join( ', ' )} REASON == Data not exist that satisfy where condition \n` );
            }

            //Get leads of lead group(s)
            let result = await this.lead_management.find( {
                lead_group_uuid: lgQuery,
                tenant_uuid,
                in_dnc: "1",
                $or: [ { campaign_uuid: voice_broadcast_uuid }, { campaign_uuid: "" }, { campaign_uuid: null }, { campaign_uuid: { $exists: false } } ]
            }, { lead_management_uuid: 1, lead_group_uuid: 1, lead_status: 1, _id: 0 } ).exec();

            if ( !result || result.length === 0 ) {
                // Fallback search without campaign_uuid match constraint
                result = await this.lead_management.find( { lead_group_uuid: lgQuery, tenant_uuid, in_dnc: "1" }, { lead_management_uuid: 1, lead_group_uuid: 1, lead_status: 1, _id: 0 } ).exec();
                Logger.debug( `Fetched total leads (fallback) : ${result?.length || 0} from lead group(s) : ${lgUuids.join( ', ' )} \n` );
            }

            //check lead_status exist or not, then queue matched leads (shared with the single-lead auto-churn path)
            const leadUuidsToQueue = result.map( ( data: any ) => data.lead_management_uuid );
            const queuedUuids = await this.enqueueLeadsForBroadcast( tenant_uuid, voice_broadcast_uuid, leadUuidsToQueue );
            this.vbLogger.info( "reset_leads.queued", `Queued ${queuedUuids.length}/${result.length} matched lead(s) into lead broadcast queue`, { candidates: result.length, queued: queuedUuids.length, lead_group_uuid: lgUuids } );

            //Take 100 leads from lead_broadcast_queue
            let fetchLeads = await this.lead_broadcast_queue.find( { tenant_uuid, lead_group_uuid: lgQuery } ).limit( 100 ).exec();
            if ( fetchLeads.length > 0 ) {
                Logger.debug( `Fetched 100 leads from lead broadcast queue , so deleting 100 records from lead broadcast queue \n` );

                //Add 100 records
                let deleteLeads = await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery } );

                if ( deleteLeads.deletedCount > 0 ) {
                    Logger.debug( `Deleted total leads : ${deleteLeads.deletedCount} from main broadcast for lead group(s) : ${lgUuids.join( ', ' )} \n` );
                } else {
                    Logger.error( `Unable to delete leads from main broadcast for lead group(s) : ${lgUuids.join( ', ' )} REASON == Data not exist that satisfy where condition\n` );
                }

                await this.main_broadcast_queue.insertMany( fetchLeads, { ordered: false } );

                let lastElement: any = fetchLeads[ fetchLeads.length - 1 ];
                lastElement = lastElement.count;
                let result = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery, count: { "$lte": lastElement } } );
                Logger.debug( `Deleted leads count from lead broadcast ===== count : ${result.deletedCount} \n` );
                this.vbLogger.info( "reset_leads.completed", `Lead reset successfully, hopper primed with ${fetchLeads.length} lead(s)`, { hopper_count: fetchLeads.length, lead_group_uuid: lgUuids } );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Lead reset successfully` );
            } else {
                this.vbLogger.warn( "reset_leads.no_leads", `No leads available to prime the hopper for tenant : ${tenant_uuid}`, { lead_group_uuid: lgUuids } );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Unable to reset lead` );
            }

        } catch ( error: any ) {
            this.vbLogger.error( "reset_leads.failed", `Error while resetting leads : ${error.message}`, { stack: error.stack } );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.BAD_REQUEST, `Error in fetching lead` );
        }
    }

    /*
    @Usage              : Diallable-filter + insert given leads into lead_broadcast_queue. Shared by resetLeads (bulk re-churn)
                           and queueNewLeadForBroadcast (single new lead), so both stay consistent.
    @Param leadUuids     : lead_management_uuid[] to attempt to queue
    @return Array        : lead_management_uuid[] that were actually queued
    */

    async enqueueLeadsForBroadcast ( tenant_uuid: string, voice_broadcast_uuid: string, leadUuids: string[] ) {
        if ( !leadUuids || leadUuids.length === 0 ) return [];

        let result = await this.lead_management.find(
            { lead_management_uuid: { $in: leadUuids }, tenant_uuid, in_dnc: "1" },
            { lead_management_uuid: 1, lead_group_uuid: 1, lead_status: 1, _id: 0 }
        ).exec();

        if ( !result || result.length === 0 ) return [];

        let allLeads: any = await this.addAllLeadsInQueue( result, tenant_uuid, voice_broadcast_uuid );
        let obj = {}, allLeadsArr = [], queuedUuids = [];

        ( allLeads || [] ).forEach( ( data: any ) => {
            if ( data != undefined ) {
                obj = { lead_management_uuid: data.lead_management_uuid, tenant_uuid, count: queuedUuids.length + 1, lead_group_uuid: data.lead_group_uuid };
                allLeadsArr.push( obj );
                queuedUuids.push( data.lead_management_uuid );
            }
        } );

        if ( allLeadsArr.length > 0 ) {
            await this.lead_broadcast_queue.insertMany( allLeadsArr );
            this.vbLogger.debug( "queue.leads_inserted", `Enqueued ${allLeadsArr.length}/${leadUuids.length} lead(s) into lead broadcast queue`, { requested: leadUuids.length, candidates: result.length, queued: allLeadsArr.length }, { voice_broadcast_uuid } );
        }

        return queuedUuids;
    }

    /*
    @Usage                 : To auto-queue a single newly created lead into the voice broadcast linked to its lead group.
                              If the broadcast is idle/stopped but its own schedule (start_date/end_date) says it should
                              be active right now, it is auto-started (same as clicking Start) before queueing.
    @Param tenant_uuid      : tenant uuid the lead was created under
    @Param lead             : { lead_management_uuid, lead_group_uuid } of the newly created lead
    @Param voice_broadcast_uuid : optional explicit broadcast uuid, else resolved from lead_group_uuid
    @return Object          : { queued, voice_broadcast_uuid, reason? }
    */

    async queueNewLeadForBroadcast ( tenant_uuid: string, lead: { lead_management_uuid: string, lead_group_uuid: string }, voice_broadcast_uuid?: string ) {
        return runWithVoiceBroadcastLogContext(
            { tenant_uuid, voice_broadcast_uuid, lead_management_uuid: lead.lead_management_uuid },
            () => this.queueNewLeadForBroadcastImpl( tenant_uuid, lead, voice_broadcast_uuid )
        );
    }

    private async queueNewLeadForBroadcastImpl ( tenant_uuid: string, lead: { lead_management_uuid: string, lead_group_uuid: string }, voice_broadcast_uuid?: string ) {
        this.vbLogger.debug( "auto_churn.triggered", `vb_auto_churn requested for lead : ${lead.lead_management_uuid}`, { lead_group_uuid: lead.lead_group_uuid, voice_broadcast_uuid: voice_broadcast_uuid || null } );
        try {
            //Same dual linkage signal the dialer itself uses in initiateBroadcastCalls()/getLeads():
            //broadcast.lead_group_uuid array OR lead_group.campaign_uuid pointing back at the broadcast
            const leadGroup: any = await this.lead_group.findOne( { uuid: lead.lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, _id: 0 } ).exec();

            let broadcast: any;
            if ( voice_broadcast_uuid ) {
                broadcast = await this.voice_broadcast.findOne( { uuid: voice_broadcast_uuid, tenant_uuid } ).exec();
            } else {
                broadcast = await this.voice_broadcast.findOne( {
                    tenant_uuid,
                    $or: [ { lead_group_uuid: lead.lead_group_uuid }, ...( leadGroup?.campaign_uuid ? [ { uuid: leadGroup.campaign_uuid } ] : [] ) ]
                } ).exec();
            }

            if ( !broadcast ) {
                this.vbLogger.warn( "auto_churn.not_linked", `No voice broadcast linked to lead group : ${lead.lead_group_uuid}`, { lead_group_uuid: lead.lead_group_uuid } );
                return { queued: false, voice_broadcast_uuid: voice_broadcast_uuid || null, reason: "not_linked" };
            }

            const lgUuids = this.getLeadGroupUuids( broadcast.lead_group_uuid );
            const linked = lgUuids.includes( String( lead.lead_group_uuid ) ) || leadGroup?.campaign_uuid === broadcast.uuid;
            if ( !linked ) {
                this.vbLogger.warn( "auto_churn.not_linked", `Lead group : ${lead.lead_group_uuid} is not linked to broadcast : ${broadcast.uuid}`, { lead_group_uuid: lead.lead_group_uuid }, { voice_broadcast_uuid: broadcast.uuid } );
                return { queued: false, voice_broadcast_uuid: broadcast.uuid, reason: "not_linked" };
            }

            if ( ![ "1", "2" ].includes( broadcast.broadcast_status ) ) {
                //vb_auto_churn agenda: if the broadcast's own schedule says it should be active right now,
                //trigger it immediately (same as clicking Start) instead of just skipping the lead.
                const now = this.commonFn.getTodayDate( true );
                const withinSchedule = !!broadcast.start_date && !!broadcast.end_date && now >= broadcast.start_date && now <= broadcast.end_date;

                if ( !withinSchedule ) {
                    const reason = broadcast.end_date && now > broadcast.end_date ? "broadcast_ended" : "broadcast_paused";
                    this.vbLogger.warn( `auto_churn.${reason}`, `Broadcast : ${broadcast.uuid} is not accepting leads (status : ${broadcast.broadcast_status})`, { broadcast_status: broadcast.broadcast_status, start_date: broadcast.start_date, end_date: broadcast.end_date, now }, { voice_broadcast_uuid: broadcast.uuid } );
                    return { queued: false, voice_broadcast_uuid: broadcast.uuid, reason };
                }

                //Atomic claim: only the request that actually flips broadcast_status here schedules the start cron,
                //so concurrent auto-churn triggers on the same idle broadcast can't double-schedule it.
                const claimed = await this.voice_broadcast.findOneAndUpdate(
                    { uuid: broadcast.uuid, tenant_uuid, broadcast_status: { $in: [ "0", "3" ] } },
                    { $set: { broadcast_status: "1" } }
                ).exec();

                if ( claimed ) {
                    this.vbLogger.info( "auto_churn.start_claimed", `Auto-starting broadcast : ${broadcast.uuid} (due per its own schedule)`, {}, { voice_broadcast_uuid: broadcast.uuid } );
                    await this.updateBroadcastStatus( { voice_broadcast_uuid: broadcast.uuid, tenant_uuid } as StartBroadcastDto, "in-progress" );
                } else {
                    this.vbLogger.debug( "auto_churn.start_skipped_race", `Broadcast : ${broadcast.uuid} already being started by a concurrent request`, {}, { voice_broadcast_uuid: broadcast.uuid } );
                }
                broadcast.broadcast_status = "1";
            }

            const [ inQueue, inMain ] = await Promise.all( [
                this.lead_broadcast_queue.findOne( { tenant_uuid, lead_management_uuid: lead.lead_management_uuid } ).exec(),
                this.main_broadcast_queue.findOne( { tenant_uuid, lead_management_uuid: lead.lead_management_uuid } ).exec()
            ] );
            if ( inQueue || inMain ) {
                this.vbLogger.debug( "auto_churn.already_queued", `Lead : ${lead.lead_management_uuid} is already queued for broadcast : ${broadcast.uuid}`, {}, { voice_broadcast_uuid: broadcast.uuid } );
                return { queued: false, voice_broadcast_uuid: broadcast.uuid, reason: "already_queued" };
            }

            const queuedUuids = await this.enqueueLeadsForBroadcast( tenant_uuid, broadcast.uuid, [ lead.lead_management_uuid ] );
            if ( queuedUuids.includes( lead.lead_management_uuid ) ) {
                this.vbLogger.info( "auto_churn.queued", `Lead : ${lead.lead_management_uuid} queued into broadcast : ${broadcast.uuid}`, {}, { voice_broadcast_uuid: broadcast.uuid } );
                return { queued: true, voice_broadcast_uuid: broadcast.uuid };
            }
            this.vbLogger.debug( "auto_churn.not_diallable", `Lead : ${lead.lead_management_uuid} disposition is not diallable for broadcast : ${broadcast.uuid}`, {}, { voice_broadcast_uuid: broadcast.uuid } );
            return { queued: false, voice_broadcast_uuid: broadcast.uuid, reason: "not_diallable" };
        } catch ( error: any ) {
            this.vbLogger.error( "auto_churn.error", `Error auto-queueing lead : ${lead.lead_management_uuid} : ${error.message}`, { stack: error.stack }, { voice_broadcast_uuid: voice_broadcast_uuid || null } );
            return { queued: false, voice_broadcast_uuid: voice_broadcast_uuid || null, reason: "queue_error" };
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

        let vbData = await this.voice_broadcast.findOne( { uuid: campaign_uuid }, { lead_group_uuid: 1 } ).exec();
        let vbLgUuids = this.getLeadGroupUuids( vbData?.lead_group_uuid );

        let whereConditions: any[] = [ { campaign_uuid } ];
        if ( vbLgUuids.length > 0 ) {
            whereConditions.push( { uuid: { $in: vbLgUuids } } );
        }

        let whereQuery: any = { $or: whereConditions };
        if ( role == "tenant" && tenant_uuid ) {
            whereQuery = { $and: [ { tenant_uuid }, { $or: whereConditions } ] };
        }

        result = await this.lead_group.find( whereQuery, { uuid: 1, _id: 0, name: 1, status: 1 } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).exec();

        //Do query for count only when result greater than 0
        if ( result.length > 0 ) {
            totalCount = await this.lead_group.find( whereQuery ).count().exec();
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
                if ( !data?.lead_status ) {
                    return;
                }
                let resCount = await self.outbound_campaign_diallable_status.find( {
                    $and: [
                        { $or: [ { tenant_uuid }, { outbound_campaign_uuid: campaign_uuid } ] },
                        { $and: [ { outbound_campaign_uuid: campaign_uuid }, { $or: [ { disposition_uuid: data.lead_status }, { outbound_campaign_disposition_uuid: data.lead_status } ] } ] }
                    ]
                } ).count().exec();
                if ( resCount > 0 ) {
                    data.lead_management_uuid;
                    data.lead_group_uuid;
                    await self.lead_management.updateOne( { lead_management_uuid: data.lead_management_uuid }, { $set: { retries_count: 0 } } ).exec();
                    return data;
                }
            } );
            result = await Promise.all( allData );
            resolve( result.filter( Boolean ) );
        } );
    }

    /*************************** VOICE BROADCAST CRON JOBS **************************************/


    async updateBroadcastStatus ( startBroadcastDto: StartBroadcastDto, action, currentDate: any = "" ) {
        //Only start a fresh correlated run if the caller isn't already inside one (e.g. queueNewLeadForBroadcast) -
        //otherwise this stays part of the caller's existing trail instead of fragmenting it.
        if ( !getVoiceBroadcastLogContext().run_id ) {
            return runWithVoiceBroadcastLogContext(
                { tenant_uuid: startBroadcastDto?.tenant_uuid as string, voice_broadcast_uuid: startBroadcastDto?.voice_broadcast_uuid as string },
                () => this.updateBroadcastStatus( startBroadcastDto, action, currentDate )
            );
        }

        try {
            const { voice_broadcast_uuid, tenant_uuid } = startBroadcastDto;
            this.vbLogger.info( "broadcast.status_update_requested", `Broadcast status update requested : ${action}`, { action } );

            //Update cron status
            let populateFileds = [ { path: "outgoing_rules", select: "uuid rules route_type no_cli_mode" } ];
            let voiceBroadcastData: any = await this.voice_broadcast.findOne( { uuid: voice_broadcast_uuid } ).populate( populateFileds ).exec();
            let { channel, caller_id, start_date, end_date, amd, caller_id_type,skip }: any = voiceBroadcastData;

            start_date = currentDate != "" ? currentDate : start_date;
            //this.commonFn.getTodayDate(true) > start_date &&
            if ( this.commonFn.getTodayDate( true ) < end_date ) {
                let addTwoMinutesInCurrentDate = new Date();
                addTwoMinutesInCurrentDate.setMinutes( addTwoMinutesInCurrentDate.getMinutes() + 1 );
                start_date = this.getFormattedDate( addTwoMinutesInCurrentDate );
                this.vbLogger.debug( "broadcast.start_date_reset", `Broadcast will start on current date time ==> NEW START DATE : ${start_date}`, { start_date } );
            } else {
                this.vbLogger.error( "broadcast.end_date_passed", `End date time has passed, no calls will initiate with broadcast : ${voice_broadcast_uuid}`, { end_date } );
                this.updateBroadCastFlag( voice_broadcast_uuid, "3" );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.BAD_REQUEST, `Broadcast end date time should be any future date` );
            }

            let rules = await this.getRulesWithTrunk( voiceBroadcastData.outgoing_rules[ 0 ].rules );
            this.vbCliRules[ String( voice_broadcast_uuid ) ] = isCliRoute( voiceBroadcastData.outgoing_rules[ 0 ] ) ? voiceBroadcastData.outgoing_rules[ 0 ] : null;

            //Update cron status
            let broadcast_status = action == "in-progress" ? "1" : "3";
            await this.updateBroadCastFlag( voice_broadcast_uuid, broadcast_status );

            this.updateCronStatus( start_date, end_date, voice_broadcast_uuid, action, tenant_uuid, channel, caller_id, rules, amd, caller_id_type,skip );
        } catch ( error: any ) {
            this.vbLogger.error( "broadcast.status_update_failed", `Error updating broadcast status : ${error.message}`, { stack: error.stack } );
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
                const scheduledFor = new Date( startDate );
                const job = new CronJob( scheduledFor, async () => {
                    const actualFireTime = new Date();
                    const driftMs = actualFireTime.getTime() - scheduledFor.getTime();
                    //Fresh run_id per dial session - the HTTP request that scheduled this may have completed
                    //long before the cron fires, so this starts its own correlated trail for the whole dial run.
                    await runWithVoiceBroadcastLogContext( { tenant_uuid, voice_broadcast_uuid: voiceBroadcastUUID }, async () => {
                        this.vbLogger.info( "broadcast.dial_session_started", `Voice broadcast started (scheduled for ${startDate}, fired at ${this.getFormattedDate( actualFireTime )}, drift ${driftMs}ms)`, { scheduled_for: startDate, fired_at: this.getFormattedDate( actualFireTime ), drift_ms: driftMs } );
                        await this.updateBroadCastFlag( voiceBroadcastUUID, "2" );
                        this.initiateBroadcastCalls( voiceBroadcastUUID, tenant_uuid, endDate, channel, caller_id, outgoingRulesDetails, amd, caller_id_type ,skip);
                    } );
                } );
                job.start();
                const schedule = this.describeSchedule( scheduledFor );
                this.vbLogger.info( "broadcast.scheduled", `Broadcast scheduled to start at ${schedule.at} (${schedule.human}), end date : ${endDate}`, { next_run_at: schedule.at, starts_in_seconds: schedule.in_seconds, endDate } );
            } else {
                if ( this.stoppedBroadcastList.includes( voiceBroadcastUUID ) == false ) {
                    this.stoppedBroadcastList.push( voiceBroadcastUUID );
                }
                this.vbLogger.debug( "broadcast.stop_requested", `Broadcast added to stopped list`, { stoppedBroadcastList: this.stoppedBroadcastList } );
            }
        } catch ( error: any ) {
            this.vbLogger.error( "broadcast.cron_schedule_failed", `Error scheduling broadcast cron : ${error.message}`, { stack: error.stack } );
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
            let vbData = await this.voice_broadcast.findOne( { uuid: voiceBroadcastUUID }, { lead_group_uuid: 1 } ).exec();
            let vbLgUuids = this.getLeadGroupUuids( vbData?.lead_group_uuid );

            let leadgroupData = await this.lead_group.find( { $or: [ { campaign_uuid: voiceBroadcastUUID }, ...( vbLgUuids.length > 0 ? [ { uuid: { $in: vbLgUuids } } ] : [] ) ] }, { uuid: 1, _id: 0 } ).exec();

            let allLgUuids = Array.from( new Set( [ ...vbLgUuids, ...leadgroupData.map( lg => String( lg.uuid ) ) ] ) );

            // Ensure queue has leads populated for ALL selected lead groups
            await this.ensureQueuePopulatedForAllLeadGroups( voiceBroadcastUUID, tenant_uuid, allLgUuids );

            let delayValue = Math.floor( 60 / channel );
            delayValue = delayValue * 1000;
            this.vbLogger.info( "broadcast.dial_batch_configured", `Sending calls with delay : ${delayValue / 1000} seconds`, { delaySeconds: delayValue / 1000, channel, lead_group_uuid: allLgUuids } );
            this.startSendingCalls( channel, delayValue, endDate, tenant_uuid, voiceBroadcastUUID, caller_id, allLgUuids, outgoingRulesDetails, amd, caller_id_type,skip );
        } catch ( error: any ) {
            this.vbLogger.error( "broadcast.initiate_failed", `Error initiating broadcast calls : ${error.message}`, { stack: error.stack }, { voice_broadcast_uuid: voiceBroadcastUUID } );
        }
    }

    async ensureQueuePopulatedForAllLeadGroups ( voiceBroadcastUUID: string, tenant_uuid: string, allLgUuids: any[] ) {
        if ( !allLgUuids || allLgUuids.length === 0 ) return;

        let missingLgUuids: string[] = [];
        for ( const lgUuid of allLgUuids ) {
            const mainCount = await this.main_broadcast_queue.countDocuments( { tenant_uuid, lead_group_uuid: lgUuid } );
            const queueCount = await this.lead_broadcast_queue.countDocuments( { tenant_uuid, lead_group_uuid: lgUuid } );
            if ( mainCount === 0 && queueCount === 0 ) {
                missingLgUuids.push( lgUuid );
            }
        }

        if ( missingLgUuids.length > 0 ) {
            this.vbLogger.debug( "broadcast.queue_gap_detected", `Populating missing lead groups in queue`, { lead_group_uuid: missingLgUuids }, { voice_broadcast_uuid: voiceBroadcastUUID } );
            let result = await this.lead_management.find( {
                lead_group_uuid: { $in: missingLgUuids },
                tenant_uuid,
                in_dnc: "1"
            }, { lead_management_uuid: 1, lead_group_uuid: 1, lead_status: 1, _id: 0 } ).exec();

            if ( result && result.length > 0 ) {
                let allLeads: any = await this.addAllLeadsInQueue( result, tenant_uuid, voiceBroadcastUUID );
                let obj = {}, allLeadsArr = [], count = 0;
                ( allLeads || [] ).forEach( ( data: any ) => {
                    if ( data != undefined ) {
                        count++;
                        obj = { lead_management_uuid: data.lead_management_uuid, tenant_uuid, count, lead_group_uuid: data.lead_group_uuid };
                        allLeadsArr.push( obj );
                    }
                } );
                if ( allLeadsArr.length > 0 ) {
                    await this.lead_broadcast_queue.insertMany( allLeadsArr );
                    this.vbLogger.debug( "broadcast.queue_gap_filled", `Populated ${allLeadsArr.length} leads in lead broadcast queue for missing lead groups`, { queued: allLeadsArr.length, lead_group_uuid: missingLgUuids }, { voice_broadcast_uuid: voiceBroadcastUUID } );

                    let lgQuery: any = allLgUuids.length > 1 ? { $in: allLgUuids } : allLgUuids[ 0 ];
                    let mainQueueCount = await this.main_broadcast_queue.countDocuments( { tenant_uuid, lead_group_uuid: lgQuery } );
                    if ( mainQueueCount < 100 ) {
                        let fetchLeads = await this.lead_broadcast_queue.find( { tenant_uuid, lead_group_uuid: lgQuery } ).limit( 100 - mainQueueCount ).exec();
                        if ( fetchLeads.length > 0 ) {
                            await this.main_broadcast_queue.insertMany( fetchLeads, { ordered: false } );
                            const fetchedUuids = fetchLeads.map( ( l: any ) => l.uuid );
                            await this.lead_broadcast_queue.deleteMany( { tenant_uuid, uuid: { $in: fetchedUuids } } );
                        }
                    }
                }
            }
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
        let tenant_details = await this.tenant.findOne( { uuid: tenant_uuid } ).select( "account_code,domain" ).exec();
        let account_code,tenant_domain;
        if ( tenant_details != null ) {
            account_code = tenant_details.account_code;
            tenant_domain = tenant_details.domain;
        } else {
            this.vbLogger.warn( "broadcast.tenant_lookup_missing", `No tenant found for tenant_uuid : ${tenant_uuid}, account_code/domain will be undefined`, {}, { voice_broadcast_uuid: voiceBroadcastUUID } );
        }
        const nextBatchEta = this.describeSchedule( new Date( Date.now() + channel * delayValue ) );
        this.vbLogger.info( "broadcast.dial_batch_started", `Batch of ${channel} call(s) starting, next batch expected at ${nextBatchEta.at} (${nextBatchEta.human})`, { currentDateTime, end_date, channel, delaySeconds: delayValue / 1000, next_batch_at: nextBatchEta.at, next_batch_in_seconds: nextBatchEta.in_seconds }, { voice_broadcast_uuid: voiceBroadcastUUID } );
	// Convert strings → Date
        const now = new Date(currentDateTime.replace(' ', 'T'));
        const end = new Date(end_date.replace(' ', 'T'));
        // Extract IST hour
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();
        const isWithinTimeWindow = nowMinutes < endMinutes;

        let lgUuids = this.getLeadGroupUuids( lead_group_uuid );
        let lgQuery: any = lgUuids.length > 1 ? { $in: lgUuids } : ( lgUuids[ 0 ] || lead_group_uuid );

        try {
            if ( now < end && isWithinTimeWindow) {
            // if ( end_date > currentDateTime ) {

                if ( this.allBroadcastDatas[ voiceBroadcastUUID ] == undefined || this.allBroadcastDatas[ voiceBroadcastUUID ].length == 0 ) {
                    let populateFields = [ { path: "lead_details", select: "-_id first_name last_name phone_number custom_phone_number lead_management_uuid" } ];
                    mainBroadcastData = await this.main_broadcast_queue.find( { tenant_uuid, lead_group_uuid: lgQuery } ).populate( populateFields ).limit( 100 ).exec();

                    if ( mainBroadcastData.length == 0 ) {
                        this.vbLogger.debug( "broadcast.hopper_empty", `No data in main broadcast hopper, fetching from lead broadcast queue`, {}, { voice_broadcast_uuid: voiceBroadcastUUID } );
                        mainBroadcastData = await this.fetchNext100Leads( tenant_uuid, lgQuery );
                        if ( mainBroadcastData == null ) {
                            this.vbLogger.info( "broadcast.ended_no_leads", `No leads left for broadcast, ending it`, { lead_group_uuid }, { voice_broadcast_uuid: voiceBroadcastUUID } );
                            await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                            return;
                        }
                    }
                    this.allBroadcastDatas[ voiceBroadcastUUID ] = mainBroadcastData;
                }

                for ( let i = 0; i < channel; i++ ) {
                    try {
                        // Re-check end time before each call to prevent firing after end time
                        let loopNowStr = this.commonFn.getTodayDate( true );
                        let loopNow = new Date( loopNowStr.replace( ' ', 'T' ) );
                        let loopEnd = new Date( end_date.replace( ' ', 'T' ) );
                        if ( loopNow >= loopEnd ) {
                            this.vbLogger.info( "broadcast.ended_end_time_reached", `End time ${end_date} reached mid-batch at ${loopNowStr}, stopping calls`, { end_date, loopNowStr }, { voice_broadcast_uuid: voiceBroadcastUUID } );
                            await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                            // Delete any leads we already processed in this batch
                            if ( deleteLeads.length > 0 ) {
                                await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery, uuid: { $in: deleteLeads } } );
                            }
                            return;
                        }

                        // Re-check if broadcast was manually stopped/paused
                        let isStopped = await this.checkBroadcastStatus( voiceBroadcastUUID );
                        if ( isStopped === true ) {
                            this.vbLogger.info( "broadcast.stopped_mid_batch", `Broadcast was stopped mid-batch, halting calls`, {}, { voice_broadcast_uuid: voiceBroadcastUUID } );
                            // Remove from stoppedBroadcastList (same cleanup as existing stop flow)
                            let stopIndex = this.stoppedBroadcastList.indexOf( voiceBroadcastUUID );
                            if ( stopIndex > -1 ) this.stoppedBroadcastList.splice( stopIndex, 1 );
                            if ( deleteLeads.length > 0 ) {
                                await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery, uuid: { $in: deleteLeads } } );
                            }
                            await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                            return;
                        }

                        //Send caller id
			let new_caller_id;
                        if ( caller_id_type != null) {
                            new_caller_id = await this.getCallerID( caller_id_type, caller_id, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.phone_number );
                            // new_caller_id = await this.getCallerID( caller_id_type, caller_id, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.custom_phone_number );
                        }
                        const cliRule = this.vbCliRules[ voiceBroadcastUUID ];
                        if ( this.allBroadcastDatas[ voiceBroadcastUUID ].length > 0 && cliRule ) {
                            // CLI based route : route, CLI & To number decided by caller id
                            const toNumber = this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.phone_number;
                            const cliRoute: any = await resolveCliRoute( cliRule, new_caller_id, toNumber, () => nextCliRouteRoundRobin( this.trunk.db, cliRule?.uuid ) );
                            this.vbLogger.info( "broadcast.cli_route", `CLI route for ${toNumber}`, { caller_id: new_caller_id, cli_route: cliRoute }, { voice_broadcast_uuid: voiceBroadcastUUID } );
                            if ( cliRoute.ok ) {
                                const [ failover1, failover2 ] = cliRoute.failovers || [];
                                const primaryTrunk = await this.trunk.findOne( { uuid: cliRoute.primary.trunk_uuid }, { name: 1, _id: 0 } ).exec();
                                const failoverTrunk1 = failover1 ? await this.trunk.findOne( { uuid: failover1.trunk_uuid }, { name: 1, _id: 0 } ).exec() : null;
                                const failoverTrunk2 = failover2 ? await this.trunk.findOne( { uuid: failover2.trunk_uuid }, { name: 1, _id: 0 } ).exec() : null;
                                new_caller_id = cliRoute.primary.cli;
                                trunkDetails = {
                                    lead_number: cliRoute.primary.to,
                                    trunkName: primaryTrunk?.name,
                                    failoverTrunk1Name: failoverTrunk1?.name || "",
                                    failoverTrunk2Name: failoverTrunk2?.name || "",
                                    failoverCallId1: failover1?.cli || "",
                                    failoverCallId2: failover2?.cli || "",
                                    failoverNumber1: failover1?.to || "",
                                    failoverNumber2: failover2?.to || ""
                                };
                            } else {
                                // CLI not configured in route : call is not generated
                                trunkDetails = undefined;
                            }
                            leadNumber = trunkDetails?.lead_number;
                        } else if ( this.allBroadcastDatas[ voiceBroadcastUUID ].length > 0 ) {
                            trunkDetails = await this.getTrunkUUID( outgoingRulesDetails, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.phone_number );
                            // trunkDetails = await this.getTrunkUUID( outgoingRulesDetails, this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ]?.lead_details[ 0 ]?.custom_phone_number );
                            leadNumber = trunkDetails.lead_number;
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
                        // Trunk failover: pass primary + Failover Trunk 1/2 (name + DID) so a broken primary trunk rolls over per §4.2/§4.5 of TRUNK-FAILOVER-DESIGN.md
                        let broadcastTrunkParam = {
                            trunkName: trunkDetails.trunkName,
                            secondaryTrunk: trunkDetails.failoverTrunk1Name || "",
                            tertiaryTrunk: trunkDetails.failoverTrunk2Name || "",
                            failover_call_id_1: trunkDetails.failoverCallId1 || "",
                            failover_call_id_2: trunkDetails.failoverCallId2 || "",
                            failover_number_1: trunkDetails.failoverNumber1 || "",
                            failover_number_2: trunkDetails.failoverNumber2 || ""
                        };
                        this.commonFn.getUUIDForCall( voiceBroadcastUUID, tenant_uuid, "", leadDetails, new_caller_id, broadcastTrunkParam, "30", "", "1", "", amd, "broadcast", "", tenant_domain, account_code ,"",skip);
                        this.vbLogger.info( "broadcast.call_dispatched", `Call dispatched to ${leadNumber}`, { lead_number: leadNumber, trunkName: trunkDetails.trunkName, caller_id: new_caller_id }, { voice_broadcast_uuid: voiceBroadcastUUID, lead_management_uuid: leadDetails.lead_management_uuid } );

                    } catch ( error: any ) {
                        const failedLead = this.allBroadcastDatas[ voiceBroadcastUUID ]?.[ 0 ]?.lead_details?.[ 0 ];
                        this.vbLogger.error( "broadcast.call_dispatch_failed", `Error sending call : ${error.message}`, { stack: error.stack, phone_number: failedLead?.phone_number }, { voice_broadcast_uuid: voiceBroadcastUUID, lead_management_uuid: failedLead?.lead_management_uuid } );
                    }
                    deleteLeads.push( this.allBroadcastDatas[ voiceBroadcastUUID ][ 0 ].uuid );
                    this.allBroadcastDatas[ voiceBroadcastUUID ].splice( 0, 1 );
                    await this.sleep( delayValue );
                }

                //Push all sent calls from particular broadcast
                let data = this.totalCallSent.find( x => x.broadcastUUID == voiceBroadcastUUID );
                if ( data ) {
                    data.count = Number.parseInt( data.count ) + channel;
                } else {
                    this.totalCallSent.push( {
                        count: deleteLeads.length,
                        broadcastUUID: voiceBroadcastUUID
                    } );
                }

                //Delete lead from main_broadcast_queue
                await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid: lgQuery, uuid: { $in: deleteLeads } } );
                this.vbLogger.info( "broadcast.dial_batch_completed", `${channel} calls sent successfully with delay of : ${delayValue / 1000} seconds`, { channel, delaySeconds: delayValue / 1000, total_sent: data ? data.count : deleteLeads.length }, { voice_broadcast_uuid: voiceBroadcastUUID } );

                let broadcastStatus = await this.checkBroadcastStatus( voiceBroadcastUUID );
                //Do next calls if broadcast not reached to end date
                if ( broadcastStatus == true ) { //Stop sending calls
                     this.vbLogger.info( "broadcast.stop_action_applied", `Broadcast end date was ${end_date}, but due to stop action no new calls will initiate from next minute`, { original_end_date: end_date }, { voice_broadcast_uuid: voiceBroadcastUUID } );
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

                this.vbLogger.info( "broadcast.dial_session_ended", `Broadcast has been ${text}, no more calls will initiate`, { end_reason: text }, { voice_broadcast_uuid: voiceBroadcastUUID } );
                await this.updateBroadCastFlag( voiceBroadcastUUID, "3" );
                /* let response = await this.voice_broadcast.updateOne({ uuid: voiceBroadcastUUID }, { broadcast_status: "3" }, { $upsert: true }).exec();

                 if (response.modifiedCount > 0) {
                     Logger.debug(`Broadcast status of : ${voiceBroadcastUUID} set to === 3: STOP \n`);
                 } else {
                     Logger.error(`Unable to update broadcast status of : ${voiceBroadcastUUID} \n`);
                 } */


            }
        } catch ( error: any ) {
            this.vbLogger.error( "broadcast.dial_batch_failed", `Error in startSendingCalls() : ${error.message}`, { stack: error.stack }, { voice_broadcast_uuid: voiceBroadcastUUID } );
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
        let lgUuids = this.getLeadGroupUuids( lead_group_uuid );
        let lgQuery: any = lgUuids.length > 1 ? { $in: lgUuids } : ( lgUuids[ 0 ] || lead_group_uuid );
        let fetchLeads = await this.lead_broadcast_queue.find( { tenant_uuid, lead_group_uuid: lgQuery } ).limit( 100 ).exec();
        if ( fetchLeads.length > 0 ) {
            Logger.debug( `Fetched 100 leads from lead broadcast queue , so deleting 100 records from lead broadcast queue \n` );

            await this.main_broadcast_queue.insertMany( fetchLeads, { ordered: false } );

            const fetchedUuids = fetchLeads.map( ( l: any ) => l.uuid );
            let result = await this.lead_broadcast_queue.deleteMany( { tenant_uuid, uuid: { $in: fetchedUuids } } );
            Logger.debug( `Deleted leads from lead broadcast ===== count : ${result.deletedCount} \n` );
            Logger.log( `Next 100 leads fetched successfully` );
            let final_leads = await this.main_broadcast_queue.find( { tenant_uuid, lead_group_uuid: lgQuery } ).populate( populateFields ).limit( 100 ).exec();
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
    @Usage            : To describe a scheduled time relative to now, for cron/dial-batch timing logs
                         (e.g. "in 54s" or "overdue by 3s"), so log lines are readable without diffing timestamps across lines.
    @Param  targetDate : Date the job/batch is scheduled to run at
    @return Object      : { at: formatted target time, in_seconds: signed delta, human: readable delta }
    */

    describeSchedule ( targetDate: Date ) {
        const deltaMs = targetDate.getTime() - Date.now();
        const deltaSeconds = Math.round( deltaMs / 1000 );
        const absSeconds = Math.abs( deltaSeconds );
        const minutes = Math.floor( absSeconds / 60 );
        const seconds = absSeconds % 60;
        const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        const human = deltaSeconds >= 0 ? `in ${durationStr}` : `overdue by ${durationStr}`;
        return { at: this.getFormattedDate( targetDate ), in_seconds: deltaSeconds, human };

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
            trunkDetails.failoverTrunk1Name = trunkUUID.failoverTrunk1Name;
            trunkDetails.failoverTrunk2Name = trunkUUID.failoverTrunk2Name;
            trunkDetails.failoverCallId1 = trunkUUID.failoverCallId1;
            trunkDetails.failoverCallId2 = trunkUUID.failoverCallId2;

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
            return {
                lead_number,
                trunkName: trunkDetails.trunkName,
                failoverTrunk1Name: trunkDetails.failoverTrunk1Name,
                failoverTrunk2Name: trunkDetails.failoverTrunk2Name,
                failoverCallId1: trunkDetails.failoverCallId1,
                failoverCallId2: trunkDetails.failoverCallId2
            }
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
                // Trunk failover: resolve Failover Trunk 1/2 gateway names (if configured on the rule)
                let failoverTrunk1 = data.failover_trunk_1_uuid ? await this.trunk.findOne( { uuid: data.failover_trunk_1_uuid }, { name: 1, _id: 0 } ).exec() : null;
                let failoverTrunk2 = data.failover_trunk_2_uuid ? await this.trunk.findOne( { uuid: data.failover_trunk_2_uuid }, { name: 1, _id: 0 } ).exec() : null;
                obj = {
                    length: data.length,
                    prefix: data.prefix,
                    strip: data.strip,
                    prepend: data.prepend,
                    trunk_uuid: data.trunk_uuid,
                    trunkName: trunkName?.name,
                    failover_trunk_1_uuid: data.failover_trunk_1_uuid,
                    failover_trunk_2_uuid: data.failover_trunk_2_uuid,
                    failoverTrunk1Name: failoverTrunk1?.name,
                    failoverTrunk2Name: failoverTrunk2?.name,
                    failoverCallId1: data.failover_trunk_1_call_id,
                    failoverCallId2: data.failover_trunk_2_call_id
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
            await this.lead_management.updateMany( { lead_group_uuid, tenant_uuid }, { campaign_uuid: "" } );
            let result = await this.lead_broadcast_queue.deleteMany( { campaign_uuid, lead_group_uuid } ).exec();
            await this.main_broadcast_queue.deleteMany( { tenant_uuid, lead_group_uuid } ).exec();

            let vb = await this.voice_broadcast.findOne( { uuid: campaign_uuid } ).exec();
            if ( vb?.lead_group_uuid ) {
                let currentLgs = this.getLeadGroupUuids( vb.lead_group_uuid );
                let updatedLgs = currentLgs.filter( id => id !== lead_group_uuid );
                await this.voice_broadcast.updateOne( { uuid: campaign_uuid }, { lead_group_uuid: updatedLgs } );
            }

            if ( result.deletedCount > 0 ) {
                Logger.debug( `Deleted leads with lead_group : ${lead_group_uuid} & campaign : ${campaign_uuid} == Total count : ${result.deletedCount}` );
            }
            if ( response.modifiedCount > 0 || vb?.lead_group_uuid ) {
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Lead group deleted successfully from campaign" );
            } else {
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "Unable to delete lead group" );
            }
        } catch ( error: any ) {
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
            this.vbLogger.debug( "broadcast.flag_updated", `Broadcast status set to ${action}`, { broadcast_status, action }, { voice_broadcast_uuid } );
        } else {
            //Not necessarily an error - a no-op update (status already at target value) hits this branch too.
            this.vbLogger.warn( "broadcast.flag_update_no_op", `Broadcast status update to ${broadcast_status} did not modify any document (already at that status, or not found)`, { broadcast_status }, { voice_broadcast_uuid } );
        }
    }
}
