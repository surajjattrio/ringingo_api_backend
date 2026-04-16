import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CdrsDocument, CdrsSchema } from "../schema/cdrs.schema";
import { CdrsArchiveDocument, CdrsArchiveSchema } from "../schema/cdrs-archive.schema";    
import { CDRSArchieveSearchService } from './cdrs-archive-search.service';   
import * as moment from 'moment-timezone';
import { query } from "express";

@Injectable()
export class CdrsArchiveService {

    /*
    @Usage              : To load cdrs schema and other libraries
    @Param @InjectModel : It will load cdrs schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [cdrs,commonDbFn]
    */

    constructor(
        @InjectModel( CdrsSchema.name ) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel( CdrsArchiveSchema.name ) private readonly cdrs_archive: Model<CdrsArchiveDocument>,  
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        private readonly cDRSArchieveSearchService: CDRSArchieveSearchService,

    ) { }

    /*
    @Usage          : Archived quartely CDRS
    @Method         : GET
    @return         : Array of an object with total count of archived CDRs depend on quarter
     
    */
    async quarterlyArchive () {
        try {
            //  Get last quarter dates
            let lastQuarterDates = await this.commonFn.getLastQuarterDates();
            // Logger.log( `CDRS archive - lastQuarterDates ==> ${JSON.stringify( lastQuarterDates )}` );

            //  Get current quarter dates
            let currentQuarterDates = await this.commonFn.getCurrentQuarterDates();
            // Logger.log( `CDRS archive - currentQuarterDates ==> ${JSON.stringify( currentQuarterDates )}` );

            //  Get next quarter dates
            let nextQuarterDates = await this.commonFn.getnextQuarterDates();
            // Logger.log( `CDRS archive - nextQuarterDates ==> ${JSON.stringify( nextQuarterDates )}` );

            //  Get last quarter name
            let lastQuarterName = await this.commonFn.getLastQuarterName( "_" );
            let lastQuarterToDisplay = await this.commonFn.getLastQuarterName( "-" );
            // Logger.log( `CDRS archive - lastQuarterName ==> ${lastQuarterName}` );
            // Logger.log( `CDRS archive - lastQuarterToDisplay ==> ${lastQuarterToDisplay}` );

            //  Get current date and next run date
            let currentDate = moment().format( 'YYYY-MM-DD' );  //  Proper
            // let currentDate = moment( currentQuarterDates.start ).format( 'YYYY-MM-DD' );    //  For QA
            let nextRunDate = moment( currentQuarterDates.start ).format( 'YYYY-MM-DD' );

            Logger.log( `CDRS archive - currentDate ==> ${currentDate}` );
            Logger.log( `CDRS archive - nextRunDate ==> ${nextRunDate}` );

            if ( currentDate == nextRunDate ) {
                Logger.log( 'CDRS archive - We are in to get previous quarter records !!!' );

                //  Create collection name and collection in DB run-time for CDR archive
                let createdCollectionName = await this.cDRSArchieveSearchService.createCollection( "cdrs_quarterly_archives_" + lastQuarterName );
                // console.log( "CDRS archive - createdCollectionName ==>", createdCollectionName );

                if ( createdCollectionName !== null ) {

                    //  Fields to populate
                    let populateFields = [ { path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name uuid -_id' } ];

                    //  Where caluse
                    let timezone: any = {};
                    let whereClause: any = [];
                    let startDate: any = moment.tz( lastQuarterDates.start, timezone );
                    let endDate: any = moment.tz( lastQuarterDates.end, timezone );

                    whereClause.push( { "createdAt": { "$gte": `${startDate.toDate()}`, "$lte": `${endDate}` }, user_uuid: { $ne: "" } } );
                    Logger.log( `YEARLY - CDRS archive - whereClause ==> ${JSON.stringify( whereClause )}` );

                    //  Pagination
                    let perPage = Number( process.env.DATA_LIMIT_PER_PAGE );
                    let count = await this.cdrs.find( { $and: whereClause } ).count().exec();
                    Logger.debug( count, "Search result count" );

                    if ( count > 0 ) {
                        let loopCounter = Math.ceil( count / perPage );
                        Logger.debug( loopCounter, "For loop counter ==> " );

                        for ( let index = 0, cpIndex = 1; index <= loopCounter; index++, cpIndex++ ) {
                            setTimeout( () => { }, 1000 );

                            let currentPage = cpIndex;
                            Logger.debug( currentPage, `CDRS archive - currentPage ==> ` );

                            let skip = perPage * ( currentPage - 1 );
                            Logger.debug( skip, `CDRS archive - skip ==> ` );

                            let resultCDRs = await this.cdrs.find( { $and: whereClause } ).limit( perPage ).skip( skip ).populate( populateFields ).exec();
                            // Logger.log( `CDRS archive - result ==> ${JSON.stringify( resultCDRs )}` );

                            let newData: any = [];
                            let tempData: any = {};

                            if ( resultCDRs.length > 0 ) {
                                Logger.debug( resultCDRs.length, `CDRS archive - result.length ==> ` );

                                resultCDRs.forEach( async ( element: any ) => {
                                    tempData = {
                                        _id: element._id,
                                        uuid: element.uuid,
                                        user_uuid: element.user_uuid,
                                        extension_uuid: element.extension_uuid,
                                        tenant_uuid: element.tenant_uuid,
                                        trunk_uuid: element.trunk_uuid,
                                        sip_user: element.sip_user,
                                        caller_id_name: element.caller_id_name,
                                        caller_id_number: element.caller_id_number,
                                        destination_number: element.destination_number,
                                        billsecond: element.billsecond,
                                        disposition: element.disposition,
                                        direction: element.direction,
                                        call_type: element.call_type,
                                        callstart: element.callstart,
                                        recording_path: element.recording_path,
                                        pbx_feature: element.pbx_feature,
                                        authentication_type: element.authentication_type,
                                        custom_callid: element.custom_callid,
                                        ip_map_uuid: element.ip_map_uuid,
                                        call_state: element.call_state,
                                        lead_uuid: element.lead_uuid,
                                        campaign_uuid: element.campaign_uuid,
                                        call_mode: element.call_mode,
                                        number_masking: element.number_masking,
                                        dial_method: element.dial_method,
                                        hangup_cause: element.hangup_cause,
                                        auto_call_flag: element.auto_call_flag,
                                        ivr_group: element.ivr_group,
                                        disconnected_by: element.disconnected_by,
                                        createdAt: element.createdAt,
                                        updatedAt: element.createdAt,
                                        user: element.user,
                                        extension: element.extension,
                                        tenant: element.tenant,
                                        lead_details: element.lead_details,
                                    };
                                    // Logger.log( `CDRS archive - newData ==> ${tempData}` );

                                    newData = [ ...newData, tempData ];
                                } );

                                //  Start batch insert
                                await createdCollectionName.insertMany( newData, { ordered: false } );
                                Logger.log( `CDRS archive - ${newData.length} - Record inserted` );
                            }

                            setTimeout( () => { }, 1000 );
                        }

                        //  Insert information in collection cdrs_archive
                        let dataToInsert = {
                            "collection_name": "cdrs_quarterly_archives_" + lastQuarterName,
                            "collection_name_for_display": lastQuarterToDisplay,
                            "collection_start_date": lastQuarterDates.start,
                            "collection_end_date": lastQuarterDates.end,
                            "next_run": nextQuarterDates.start,
                            "status": 1
                        }
                        let logMessages = { logSuccessMsg: "CDRS-Archive collection information inserted successfully" };
                        await this.commonDbFn.insert( this.cdrs_archive, dataToInsert, JSON.stringify( logMessages ), true );

                        return this.commonDbFn.sendResponseWithMessage( HttpStatus.CREATED, dataToInsert, logMessages.logSuccessMsg );
                    } else {
                        let logMessages = { logSuccessMsg: "CDRS-Archive collection information not found " };

                        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, null, logMessages.logSuccessMsg );
                    }
                } else {
                    //  Drop collection name and collection in DB run - time for CDR archive - Debug point
                    await this.cDRSArchieveSearchService.dropCollection( "cdrs_quarterly_archives_" + lastQuarterName );

                    let logMessages = { logSuccessMsg: "CDRS archive - Drop collection name and collection in DB at runtime for CDR archive" };
                    Logger.log( logMessages.logSuccessMsg );

                    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, null, logMessages.logSuccessMsg );
                }
            } else {
                let logMessages = { logSuccessMsg: "CDRS archive - Current date is less then next run date" };
                Logger.log( logMessages.logSuccessMsg );

                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, null, logMessages.logSuccessMsg );
            }
        } catch ( error ) {
            Logger.error( `CDRS archive - Catch block ==> Unable to archive quarterly CDRS ==> `, error.message );
            //  Logger.error( `CDRS archive - Catch found ==> CDRS archive ==> `, error );
            throw new Error( `CDRS archive - Catch block ==> Unable to archive quarterly CDRS ==> ${error.message}` );
        }
    }

    /*
    @Usage          : CDRS Quartely archived collection list
    @Method         : GET
    @return         : Array of an object with total count of quartely archived list
     
    */

    async quarterlyArchivedCollections () {
        let response = await this.cdrs_archive.find( {} ).sort( { _id: -1 } ).exec();
        return this.commonDbFn.sendResponseWithMessage( response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, response.length > 0 ? response : "Not Found" );
    }

    /*
    @Usage          : Archive one year CDRs data in quarterly created collection
    @Method         : POST
    @return         : Archieve one year CDRs data in quarterly created collection list
     
    */

    async cdrsDataArchiveToQuarterBasedOnYear ( data: any ) {
        try {
            let quarterInformation: any = {};
            //  Get current quarter dates
            quarterInformation.current = await this.commonFn.getQuarterInfo( parseInt( data.year ), 'all' );
            // Logger.log( `YEARLY - CDRS archive - Quarter Information - Current ==> ${JSON.stringify( quarterInformation.current )}` );

            //  Get next quarter dates
            quarterInformation.next = await this.commonFn.getQuarterInfo( parseInt( data.year ) + 1, 'Q1' );
            // Logger.log( `YEARLY - CDRS archive - Quarter Information - Next ==> ${JSON.stringify( quarterInformation.next )}` );

            setTimeout( async () => {
                // Logger.log( `YEARLY - CDRS archive - Quarter Information - All ==> ${JSON.stringify( quarterInformation )}` );

                if ( quarterInformation && quarterInformation.current && quarterInformation.next && quarterInformation.next[ 0 ] ) {
                    let currentQuarter = quarterInformation.current;
                    let nextQuarter = quarterInformation.next[ 0 ];
                    for ( let index = 0, nextIndex = 1; index < currentQuarter.length; index++, nextIndex++ ) {
                        const element = currentQuarter[ index ];
                        const nextElement = ( currentQuarter[ nextIndex ] ) ? currentQuarter[ nextIndex ] : "";
                        // Logger.log( `YEARLY - CDRS archive - Quarter Information - Current element ==> ${JSON.stringify( element )}` );
                        // Logger.log( `YEARLY - CDRS archive - Quarter Information - Next element ==> ${JSON.stringify( nextElement )}` );

                        //  Get current date and next run date
                        let currentDate = moment().format( 'YYYY-MM-DD' );
                        let nextRunDate = ( nextElement.start ) ? moment( nextElement.start ).format( 'YYYY-MM-DD' ) : moment( nextQuarter.start ).format( 'YYYY-MM-DD' );
                        // Logger.log( `YEARLY - CDRS archive - currentDate ==> ${currentDate}` );
                        // Logger.log( `YEARLY - CDRS archive - nextRunDate ==> ${nextRunDate}` );

                        if ( currentDate >= nextRunDate ) {
                            Logger.log( 'YEARLY - CDRS archive - We are in to get quarter records !!!' );

                            //  Remove if already existed and create collection name and collection in DB run-time for CDR archive
                            let createdCollectionName = await this.cDRSArchieveSearchService.getCollectionObject( element.quarterName );

                            if ( createdCollectionName !== null ) {
                                Logger.log( 'YEARLY - CDRS archive - Collection is created !!!' );

                                //  Fields to populate
                                let populateFields = [ { path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name uuid -_id' } ];

                                //  Where caluse
                                let whereClause: any = [];
                                let startDate: any = moment.tz( element.start, data.timezone );
                                let endDate: any = moment.tz( element.end, data.timezone );

                                whereClause.push( { "createdAt": { "$gte": `${startDate.toDate()}`, "$lte": `${endDate}` }, user_uuid: { $ne: "" } } );
                                Logger.log( `YEARLY - CDRS archive - whereClause ==> ${JSON.stringify( whereClause )}` );

                                //  Pagination
                                let perPage = Number( process.env.DATA_LIMIT_PER_PAGE );
                                let count = await this.cdrs.find( { $and: whereClause } ).count().exec();
                                Logger.debug( count, "YEARLY - Search result count" );

                                if ( count > 0 ) {
                                    let loopCounter = Math.ceil( count / perPage );
                                    Logger.debug( loopCounter, "YEARLY - For loop counter ==> " );

                                    for ( let index = 0, cpIndex = 1; index <= loopCounter; index++, cpIndex++ ) {
                                        setTimeout( () => { }, 1000 );

                                        let currentPage = cpIndex;
                                        Logger.debug( currentPage, `YEARLY - CDRS archive - currentPage ==> ` );

                                        let skip = perPage * ( currentPage - 1 );
                                        Logger.debug( skip, `YEARLY - CDRS archive - skip ==> ` );

                                        let resultCDRs = await this.cdrs.find( { $and: whereClause } ).limit( perPage ).skip( skip ).populate( populateFields ).exec();
                                        // Logger.log( `YEARLY - CDRS archive - result ==> ${JSON.stringify( resultCDRs )}` );

                                        let newData: any = [];
                                        let tempData: any = {};

                                        if ( resultCDRs.length > 0 ) {
                                            Logger.debug( resultCDRs.length, `YEARLY - CDRS archive - result.length ==> ` );

                                            resultCDRs.forEach( async ( element: any ) => {
                                                tempData = {
                                                    _id: element._id,
                                                    uuid: element.uuid,
                                                    user_uuid: element.user_uuid,
                                                    extension_uuid: element.extension_uuid,
                                                    tenant_uuid: element.tenant_uuid,
                                                    trunk_uuid: element.trunk_uuid,
                                                    sip_user: element.sip_user,
                                                    caller_id_name: element.caller_id_name,
                                                    caller_id_number: element.caller_id_number,
                                                    destination_number: element.destination_number,
                                                    billsecond: element.billsecond,
                                                    disposition: element.disposition,
                                                    direction: element.direction,
                                                    call_type: element.call_type,
                                                    callstart: element.callstart,
                                                    recording_path: element.recording_path,
                                                    pbx_feature: element.pbx_feature,
                                                    authentication_type: element.authentication_type,
                                                    custom_callid: element.custom_callid,
                                                    ip_map_uuid: element.ip_map_uuid,
                                                    call_state: element.call_state,
                                                    lead_uuid: element.lead_uuid,
                                                    campaign_uuid: element.campaign_uuid,
                                                    call_mode: element.call_mode,
                                                    number_masking: element.number_masking,
                                                    dial_method: element.dial_method,
                                                    hangup_cause: element.hangup_cause,
                                                    auto_call_flag: element.auto_call_flag,
                                                    ivr_group: element.ivr_group,
                                                    disconnected_by: element.disconnected_by,
                                                    createdAt: element.createdAt,
                                                    updatedAt: element.createdAt,
                                                    user: element.user,
                                                    extension: element.extension,
                                                    tenant: element.tenant,
                                                    lead_details: element.lead_details,
                                                };
                                                // Logger.log( `YEARLY - CDRS archive - newData ==> ${tempData}` );

                                                newData = [ ...newData, tempData ];
                                            } );

                                            //  Start batch insert
                                            await createdCollectionName.insertMany( newData, { ordered: false } );
                                            Logger.log( `YEARLY - CDRS archive - ${newData.length} - Record inserted` );
                                        }

                                        setTimeout( () => { }, 1000 );
                                    }

                                    //  Insert information in collection cdrs_archive
                                    let dataToInsert = {
                                        "collection_name": element.quarterName,
                                        "collection_name_for_display": element.quarterToDisplay,
                                        "collection_start_date": element.start,
                                        "collection_end_date": element.end,
                                        "next_run": ( nextElement.start ) ? nextElement.start : nextQuarter.start,
                                        "status": 1
                                    }
                                    const result = new this.cdrs_archive( dataToInsert );
                                    await result.save();

                                    let logMessages = { logSuccessMsg: `YEARLY - CDRS-Archive collection information inserted successfully for quarter - ${element.quarterToDisplay} !!!` };
                                    Logger.log( logMessages.logSuccessMsg );
                                } else {
                                    let logMessages = { logSuccessMsg: `YEARLY - CDRS-Archive - Records not found for quarter - ${element.quarterToDisplay} !!!` };
                                    Logger.log( logMessages.logSuccessMsg );
                                }
                            } else {
                                //  Drop collection name and collection in DB run - time for CDR archive - Debug point
                                await this.cDRSArchieveSearchService.dropCollection( element.quarterName );

                                let logMessages = { logSuccessMsg: "CDRS archive - Drop collection name and collection in DB at runtime for CDR archive" };
                                Logger.log( logMessages.logSuccessMsg );
                            }
                        } else {
                            let logMessages = { logSuccessMsg: "YEARLY - CDRS archive - Current date is less then next run date" };
                            Logger.log( logMessages.logSuccessMsg );
                        }
                    }
                } else {
                    let logMessages = { logSuccessMsg: "YEARLY - CDRS archive - Quarter information not found" };
                    Logger.log( logMessages.logSuccessMsg );

                    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, null, logMessages.logSuccessMsg );
                }
            }, 1500 );

            //  At last give responce
            let logMessages = { logSuccessMsg: "The action has been started for CDRS-Archive for given year and it will done in shotly !!!" };
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.CREATED, "OK", logMessages.logSuccessMsg );

        } catch ( error ) {
            let logMessages = { logSuccessMsg: "CATCH found - YEARLY - CDRS archive - Quarter information not found" };
            Logger.log( logMessages.logSuccessMsg );

            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NO_CONTENT, null, logMessages.logSuccessMsg );
        }
    }

}
