import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateFollowUpDto } from "../dto/create-follow-up.dto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { InjectModel } from "@nestjs/mongoose";
import { FollowUpDocument, FollowUpSchema } from "../schema/follow-up.schema";
import { Model } from "mongoose";
import { getMethod, deleteMethod } from "src/global_constant";
import { ArchiveFollowUpDto } from "../dto/archive-follow-up.dto";
import { ArchiveFollowUpDocument, ArchiveFollowUpSchema } from "../schema/archive-follow-up.schema";
import { CommonFunctions } from "src/modules/common/common_functions";
//import * as moment from "moment";
import * as moment from 'moment-timezone';
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { TimezoneDocument, TimezoneSchema } from "src/modules/timezone/schema/timezone.schema";
import { DateTime,Zone } from 'luxon';

@Injectable()

export class FollowUpService {

    /*
    @Usage              : To load follow up schema and other libraries
    @Param @InjectModel : It will load follow up schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [follow_up,commonDbFn]
    */

    constructor(
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        @InjectModel( FollowUpSchema.name ) private readonly follow_up: Model<FollowUpDocument>,
        @InjectModel( ArchiveFollowUpSchema.name ) private readonly follow_up_archive: Model<ArchiveFollowUpDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
        @InjectModel( TimezoneSchema.name ) private readonly timezone: Model<TimezoneDocument>,

    ) { }

    /*
    @Usage                      : First it will check whether given assigned_to and lead_management_uuid exist or not in given tenant , if not then new follow up will be created else it will throw error
    @Param createFollowUpDto    : Request paramter that we set into dto
    @return Object              : Success / Error
    */

    async create ( createFollowUpDto: CreateFollowUpDto ) {
        const { uuid, date_time, role, user_uuid,tenant_uuid } = createFollowUpDto;
        let logMessages = {
            logErrorMsg: "Follow up already exist \n",
            logSuccessMsg: "Follow up created successfully \n"
        }
        // let currentDateTime = new Date(date_time);
        //createFollowUpDto.reminder_date_time = date_time;
        //let reminderTime: any = "30" // It's static for now
        //let reminderDateTime = new Date(currentDateTime.setMinutes(currentDateTime.getMinutes() - reminderTime));
        //Logger.debug("Reminder time",createFollowUpDto.reminder_date_time);
        //createFollowUpDto.reminder_date_time = new Date().toISOString();

        let tenant_info = await this.tenant.findOne({ uuid: tenant_uuid }, { time_zone_uuid: 1 }).exec();
        let timezone_uuid = tenant_info.time_zone_uuid;
        let timezoneInfo = await this.timezone.findOne({ uuid : timezone_uuid },{timezone_name:1}).exec();
        let timezone_name = timezoneInfo.timezone_name;
        let timezone_name_str = timezone_name.toString();
        const customDateStrIST = date_time;
        console.log(customDateStrIST);
        // Fetch the time zone of the server dynamically
        const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Convert the input date time to Luxon DateTime object
        let customDateIST = DateTime.fromFormat(date_time, 'yyyy-MM-dd HH:mm:ss', { zone: timezone_name_str });
        // Convert the date time to the server's local time zone
        let customDateServerTime = customDateIST.setZone(serverTimeZone);
        let customDateUTC = customDateServerTime.toUTC();
        console.log("Converted Date Time (Server Time Zone):", customDateUTC);
        // Format the date time according to the desired format
        let formattedDate = customDateServerTime.toFormat("yyyy-MM-dd HH:mm:ss");
        createFollowUpDto.reminder_date_time = formattedDate;

        // createFollowUpDto.reminder_date_time = date_time;
        createFollowUpDto.created_flag = role == "agent" ? "2" : "0";
        createFollowUpDto.user_uuid = role == "agent" ? uuid : user_uuid;
        return this.commonDbFn.insert( this.follow_up, createFollowUpDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of follow up with data
    */

    async findAll ( queryParams ) {
        /*let searchFields = ["type", "comment"];
    let populateFields = [{ path: "lead_details", select: "first_name last_name phone_number -_id" }];
        return this.commonDbFn.findAllWithPagination(this.follow_up, queryParams, searchFields,populateFields);*/
        let { uuid, today } = queryParams;
        let populateFields = [
            {
                path: "lead_details",
                select: "first_name last_name phone_number custom_phone_number campaign_uuid -_id",
                populate: [
                    { path: "campaign_details", select: "name -_id" },
                    { path: "blended_campaign_details", select: "name -_id" },
                    { path: "inbound_campaign_details", select: "name -_id" }
                ]
            },
            { path: "user", select: 'username fullname' }
        ];
        if ( today == 'true' ) {
            let currentDate = new Date();

            //let currentDate = moment.tz(queryParams.date, queryParams.timezone); // Use moment-timezone for consistent date handling
            console.log( "currentDate" );
            console.log( currentDate );
            // Fetching follow-ups based on the given `tenant_uuid` and within the current date range
            let response = await this.follow_up.find( {
                // user_uuid: uuid,
                $or: [
                    { user_uuid: uuid },
                    { tenant_uuid: uuid },
                ],
                // is_readed: "1",
                reminder_date_time: {
                    $gte: currentDate.toISOString().slice( 0, 10 ) + ' 00:00:00',
                    $lte: currentDate.toISOString().slice( 0, 10 ) + ' 23:59:59',
                }
            } ).populate( populateFields ).exec();
            // Determining the HTTP status code based on the response length
            let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            // Returning the response along with the status code
            return this.commonDbFn.sendResponseWithMessage( statusCode, response );
        }
        if ( queryParams.date != undefined && queryParams.date != "" ) {
            // let response = await this.follow_up.find({ reminder_date_time: { $gte: `${queryParams.date}` } , user_uuid : uuid }).populate(populateFields).exec();
            // console.log( queryParams );
            // console.log( "queryParams" );

            let response: any = await this.follow_up.find( { user_uuid: uuid, is_readed: "0" } ).populate( populateFields ).exec();
            let days, hours, minutes, seconds, followUpArr = [], diff;
            if ( response.length > 0 ) {
                response.map( async ( data, i ) => {
                    queryParams.date = this.commonFn.getTodayDate( true );
                    let currentDate = moment( queryParams.date );
                    response[ i ].converted_date = moment.tz( response[ i ].createdAt, queryParams.timezone );
                    let notifyDate = moment( data.reminder_date_time );
                    let duration = moment.duration( notifyDate.diff( currentDate ) );

                    days = duration.days();
                    hours = duration.hours();
                    minutes = duration.minutes();
                    seconds = duration.seconds();

                    if ( days == 0 && hours == 0 ) {
                        if ( ( minutes == 5 ) || ( minutes == 30 ) ) {
                            //if( ( minutes == 4 && seconds >= 20 ) || ( minutes == 29 && seconds >= 20) ){
                            data.notification_status = "Success";
                            followUpArr.push( data );
                            /*if(( minutes == 4 && seconds >= 20 )){


                            let response = await this.follow_up.updateOne({follow_up_uuid : data.follow_up_uuid},{is_readed : "0"}).exec();
                            if (response.modifiedCount == 0) {
                                            Logger.error(`Unable to update follow up is_readed flag to 0 on where condition`);
                                         } else {
                                           Logger.debug(`Successfully updated follow up flag to 0`);
                                         }
                            }*/

                        }
                        if ( minutes == 0 ) {


                            if ( seconds < 0 ) {
                                data.notification_status = "Danger";
                                followUpArr.push( data );
                                let response = await this.follow_up.updateOne( { follow_up_uuid: data.follow_up_uuid }, { is_readed: "1" } ).exec();
                                if ( response.modifiedCount == 0 ) {
                                    Logger.error( `Unable to update follow up is_readed flag to 0 on where condition` );
                                } else {
                                    Logger.debug( `Successfully updated follow up flag to 0` );
                                }

                            }
                        }
                    }
                    // const conveteddate = {
                    //     convertedtime_date :response[ i ].convertedtime_date
                    // };
                    // const time = response[ i ].convertedtime_date;
                    // data.convertedtime_date = time;
                    // followUpArr.push( data );
                    // queryParams.date = this.commonFn.getTodayDate(true);
                    //requestDate = new Date(queryParams.date);
                    //reminderDate = new Date(data.reminder_date_time);
                    //requestDate = queryParams.date;
                    // reminderDate = data.reminder_date_time;
                    //diff = reminderDate - requestDate;
                    // console.log("DIFF",diff);
                    /* if (diff > 60e3) {
                         minutes = Math.floor(diff / 60e3)
                         num = minutes;
                         hours = (num / 60);
                         rhours = Math.floor(hours);
                         minutes = (hours - rhours) * 60;
                         rminutes = Math.round(minutes);
                         Logger.debug(`Checked diff of follow up uuid : ${data.follow_up_uuid} Difference in minutes : ${rminutes}`);
                         if ( rminutes == 5 || rminutes == 30) {
                 data.notification_status = "Success";
                             followUpArr.push(data);
                         }
                     }else if(diff > 0){

              console.log("ELSE",diff);
              data.notification_status = "Danger";
              followUpArr.push(data);
              let response = await this.follow_up.updateOne({follow_up_uuid : data.follow_up_uuid},{is_readed : "0"}).exec();
              if (response.modifiedCount == 0) {
                              Logger.error(`Unable to update follow up is_readed flag to 0 on where condition`);
                          } else {
                                    Logger.debug(`Successfully updated follow up flag to 0`);
                         }
             }*/
                    //console.log("ARR",followUpArr);
                    // console.log( "==notifyDate====" );
                    // console.log( data[ i ].converted_date );
                } )
            }
            let statusCode = followUpArr.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage( statusCode, followUpArr );
        } else {

            let searchFields = [ "type", "comment" ];
            return this.commonDbFn.findAllWithPagination( this.follow_up, queryParams, searchFields, populateFields );
        }
    }

    /*
    @Usage          : To get single follow up record based on uuid
    @Param uuid     : Search follow up by uuid
    @return Object  : Result of follow up
    */

    async findOne ( follow_up_uuid: string, rescheduled = false ) {
        let logMessages = {
            logErrorMsg: `Follow up not found by uuid : ${follow_up_uuid} \n`,
            logSuccessMsg: `Follow up success fetched by uuid : ${follow_up_uuid} \n`
        }
        let populateFields = [
            {
                path: "lead_details",
                select: "first_name last_name phone_number custom_phone_number campaign_uuid -_id",
                populate: [
                    { path: "campaign_details", select: "name -_id" },
                    { path: "blended_campaign_details", select: "name -_id" },
                    { path: "inbound_campaign_details", select: "name -_id" }
                ]
            },
            { path: "user", select: 'username fullname' }
        ];
        const result = await this.follow_up.findOne( { follow_up_uuid } ).populate(populateFields).exec();
        const res = logMessages;
        if ( result == null ) {
            Logger.error( res.logErrorMsg, getMethod );
            res.logErrorMsg = res.logErrorMsg.split( "by" )[ 0 ].trim();
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, res.logErrorMsg );
        }
        Logger.debug( res.logSuccessMsg );
        if ( rescheduled ) {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, result.reschedule_details );
        } else {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, result );
        }
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update ( follow_up_uuid: string, createFollowUpDto: CreateFollowUpDto ) {
        const { uuid, role, user_uuid, is_reschedule, type, date_time, comment,tenant_uuid } = createFollowUpDto;
        let logMessages = {
            logErrorMsg: `Follow up not found by uuid : ${follow_up_uuid} \n`,
            logSuccessMsg: `Follow up updated successfully by uuid : ${follow_up_uuid} \n`
        }
        createFollowUpDto.created_flag = role == "agent" ? "2" : "0";
        createFollowUpDto.user_uuid = role == "agent" ? uuid : user_uuid;

        //Check agent has re-scheduled follow up or not
        if ( is_reschedule == "0" ) {
            createFollowUpDto.is_readed = "0";
            createFollowUpDto[ "$push" ] = { reschedule_details: { date: date_time, type, comment } };
        }
        let tenant_info = await this.tenant.findOne({ uuid: tenant_uuid }, { time_zone_uuid: 1 }).exec();
        let timezone_uuid = tenant_info.time_zone_uuid;
        let timezoneInfo = await this.timezone.findOne({ uuid : timezone_uuid },{timezone_name:1}).exec();
        let timezone_name = timezoneInfo.timezone_name;
        let timezone_name_str = timezone_name.toString();
        const customDateStrIST = date_time;
        console.log(customDateStrIST);
        // Fetch the time zone of the server dynamically
        const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Convert the input date time to Luxon DateTime object
        let customDateIST = DateTime.fromFormat(date_time, 'yyyy-MM-dd HH:mm:ss', { zone: timezone_name_str });
        // Convert the date time to the server's local time zone
        let customDateServerTime = customDateIST.setZone(serverTimeZone);
        let customDateUTC = customDateServerTime.toUTC();
        console.log("Converted Date Time (Server Time Zone):", customDateUTC);
        // Format the date time according to the desired format
        let formattedDate = customDateServerTime.toFormat("yyyy-MM-dd HH:mm:ss");
        createFollowUpDto.reminder_date_time = formattedDate;

        // createFollowUpDto.reminder_date_time = date_time;
        const result = await this.follow_up.updateOne( { follow_up_uuid }, createFollowUpDto ).exec();
        const res = logMessages;
        if ( result.matchedCount == 0 && result.modifiedCount == 0 ) {
            Logger.error( res.logErrorMsg, deleteMethod );
            res.logErrorMsg = res.logErrorMsg.split( "by" )[ 0 ].trim();
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, res.logErrorMsg );
        }
        Logger.debug( res.logSuccessMsg );
        res.logSuccessMsg = res.logSuccessMsg.split( "by" )[ 0 ].trim();
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, res.logSuccessMsg );
    }

    /*
    @Usage              : To search follow up using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of follow up with data
    */

    async advancedSearch ( searchParams ) {
        let populateFields = [
            {
                path: "lead_details",
                select: "first_name last_name phone_number custom_phone_number campaign_uuid -_id",
                populate: [
                    { path: "campaign_details", select: "name -_id" },
                    { path: "blended_campaign_details", select: "name -_id" },
                    { path: "inbound_campaign_details", select: "name -_id" }
                ]
            },
            { path: "user", select: 'username fullname' }
        ];
        return this.commonDbFn.advancedSearch( this.follow_up, searchParams, populateFields );
    }

    /*
    @Usage         : Delete single or multiple follow up using uuid
    @Param uuid    : To delete single follow up pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    /*async remove(follow_up_uuid: string) {
        let logMessages = {
            logErrorMsg: `Follow up not exist by uuid : ${follow_up_uuid} \n`,
            logSuccessMsg: `Follow up deleted successfully by uuid : ${follow_up_uuid} \n`
        }
        //return this.commonDbFn.delete(this.follow_up, { follow_up_uuid }, JSON.stringify(logMessages));
    }*/


    async remove ( follow_up_uuid: string ) {
        let logMessages = {
            logErrorMsg: `Follow up not exist by uuid : ${follow_up_uuid} \n`,
            logSuccessMsg: `Follow up deleted successfully by uuid : ${follow_up_uuid} \n`
        }
        let uuids = follow_up_uuid.split( "," );
        const result = await this.follow_up.deleteMany( { follow_up_uuid: { $in: uuids } } ).exec();
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
    @Usage                       : Delete follow up from follow_up collection using uuid and add same data in follow_up_archive
    @Param archiveFollowUpDto    : Request Dto
    @return Object               : Success / Error
    */

    async moveFollowUpToArchive ( archiveFollowUpDto: ArchiveFollowUpDto ) {
        const { follow_up_uuid } = archiveFollowUpDto;
        let result;
        try {
            result = await this.follow_up.findOne( { follow_up_uuid } ).exec();
            await this.follow_up_archive.insertMany( result );

            let response = await this.follow_up.deleteOne( { follow_up_uuid } ).exec();
            if ( response.deletedCount == 0 ) {
                Logger.error( `Unable to find follow up uuid : ${follow_up_uuid}` );
            } else {
                Logger.debug( `Follow up uuid ${follow_up_uuid} deleted successfully from follow_up` );
            }
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Follow up added successfully in archive` );
        } catch ( error ) {
            Logger.debug( `Error in adding follow up to archive`, error.message );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `Error in adding follow up to archive` );
        }
    }


    /*
    @Usage                       : List all follow up of lead
    @Param lead_management_uuid  : Lead uuid
    @return Object               : Success / Error
    */

    async getFollowUpsOfLead ( lead_management_uuid, queryParam ) {
        const { tenant_uuid } = queryParam;
        let response = await this.follow_up.find( { lead_management_uuid, tenant_uuid } ).exec();
        let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage( statusCode, response );
    }


    /*
    @Usage         : To update status of follow up
    @Param uuid    : uuid of conference
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Follow up not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Follow up status updated successfully by uuid : ${uuid} \n`
        }
        let result = await this.follow_up.updateOne( { follow_up_uuid: uuid }, body ).exec();
        const res = logMessages;
        if ( result.matchedCount == 0 && result.modifiedCount == 0 ) {
            Logger.error( res.logErrorMsg, deleteMethod );
            res.logErrorMsg = res.logErrorMsg.split( "by" )[ 0 ].trim();
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, res.logErrorMsg );
        }
        Logger.debug( res.logSuccessMsg );
        res.logSuccessMsg = res.logSuccessMsg.split( "by" )[ 0 ].trim();
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, res.logSuccessMsg );
    }
}

