import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateLeadGroupDto } from "../dto/create-lead-group.dto";
import { LeadGroupDocument, LeadGroupSchema } from "../schema/lead-group.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { putMethod } from "src/global_constant";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "src/modules/lead-management/schema/leads-in-queue.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import * as fs from "fs";
import * as moment from 'moment-timezone';
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { VoiceBroadcastDocument, VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";

@Injectable()

export class LeadGroupService {

    /*
    @Usage              : To load lead group schema and other libraries
    @Param @InjectModel : It will load lead group schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [lead_group,commonDbFn]
    */

    constructor(
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(VoiceBroadcastSchema.name) private readonly voice_broadcast: Model<VoiceBroadcastDocument>,

        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new lead group will be created else it will throw error
    @Param createLeadGroupDto  : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createLeadGroupDto: CreateLeadGroupDto ) {
        const { name, tenant_uuid, role, webhook } = createLeadGroupDto;
        let where = [ { name }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "Lead group already exist \n",
            logSuccessMsg: "Lead group created successfully \n"
        }
        if ( role == "manager" ) {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createLeadGroupDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createLeadGroupDto.tenant_uuid = tenantInfo.tenant_uuid;
                createLeadGroupDto.manager_uuid = lookupUuid as string;
            } else {
                createLeadGroupDto.manager_uuid = lookupUuid as string;
            }
        }
        if (webhook === true) {
            const result = this.commonDbFn.findAndInsert(this.lead_group, where, createLeadGroupDto, JSON.stringify(logMessages), "and", true);
            return {statusCode: (await result)?.statusCode, message: (await result)?.data, lead_group_uuid: (await result)?.message?.uuid }
        } else {
            return this.commonDbFn.findAndInsert( this.lead_group, where, createLeadGroupDto, JSON.stringify( logMessages ), "and");
        }
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of lead group with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "name" ];
        let populateFields = [ { path: "user_group", select: 'name' } ];
        let result = await this.commonDbFn.findAllWithPagination( this.lead_group, queryParams, searchFields, populateFields, { status: 1, _id: -1 }, true, true );
        if ( result.statusCode == 404 ) { return result }

        // result.data = result.data.map(item => ({...item, name: item.name?.trim().replace(/\s+/g, ' ')}));

        // let data = result.data;
        // let totalLeadCount,finalArray=[];
        // for (const result of data) {
        //    totalLeadCount = await this.lead_management.find({lead_group_uuid : result.uuid}).count().exec();
        //    result.totalLeadCount = totalLeadCount;
        //    finalArray.push(result);
        // }
        return this.commonDbFn.sendResponseWithCount( HttpStatus.OK, result.data, result.count );
    }

    /*
    @Usage          : To get single lead group record based on uuid
    @Param uuid     : Search lead group by uuid
    @return Object  : Result of lead group
    */

    async findOne ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Lead group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead group success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne( this.lead_group, uuid, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update lead group by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update ( uuid: string, createLeadGroupDto: CreateLeadGroupDto ) {
        const { name, tenant_uuid, campaign_uuid } = createLeadGroupDto;
        const getLeadGroup = await this.lead_group.findOne( { uuid } ).exec();
        if ( getLeadGroup?.name != name ) {
            const checkLeadGroupExist = await this.lead_group.find( { $and: [ { name }, { tenant_uuid } ] } ).count().exec();
            if ( checkLeadGroupExist > 0 ) {
                Logger.error( "Lead group already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Lead group already exist` );
            }
        }
        //If campaign update then update campaign based on lead group in leads_in_queue collection
        if ( getLeadGroup?.campaign_uuid != campaign_uuid ) {
            try {
                Logger.debug( "Updating campaign uuid" );
                this.leads_in_queue.updateMany( { lead_group_uuid: uuid }, { campaign_uuid } );
            } catch ( error ) {
                console.log( "Error", error.message );
            }
        }
        let logMessages = {
            logErrorMsg: `Lead group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead group updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.lead_group, uuid, createLeadGroupDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search lead group using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of lead group with data
    */

    async advancedSearch ( searchParams ) {
        let populateFields = [ { path: "user_group", select: 'name' } ];
        return this.commonDbFn.advancedSearch( this.lead_group, searchParams, populateFields );
    }

    /*
    @Usage         : To update status of lead group[Active/Inactive]
    @Param uuid    : uuid of lead group
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Lead group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead group status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.lead_group, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple lead group using uuid
    @Param uuid    : To delete single lead group pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Lead group not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead group deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.lead_group, { uuid }, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete all lead's using lead group uuid
    @Param uuid    : uuid of lead group
    @return Object : Success / Error
    */

    // async removeAllLeads ( lead_group_uuid: string ) {
    //     try {
    //         let totalLeads = await this.lead_management.find( { lead_group_uuid } ).count().exec();
    //         let loopCounter = Math.ceil( totalLeads / 1000 ); // [Batch delete of 1000 leads]
    //         let i;
    //         if ( totalLeads > 0 ) {
    //             for ( i = 0; i < loopCounter; i++ ) {
    //                 let leadsData = await this.lead_management.find( { lead_group_uuid } ).limit( 1000 ).exec();
    //                 const result = await this.lead_management.deleteMany( { lead_management_uuid: { $in: leadsData.map( doc => doc.lead_management_uuid ) } } );
    //                 Logger.verbose( `Deleted leads ==> ${result.deletedCount}` );
    //             }
    //             return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, 'Leads deleted successfully' );
    //         } else {
    //             return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, 'No leads found' );
    //         }
    //     } catch ( error ) {
    //         Logger.error( `Error in catch block ===> removeAllLeads()`, error.message );
    //     }
    // }

    async removeAllLeads(lead_group_uuid: string) {
        try {

            // 1️⃣ Unassign leads from lead_management
            const updateResult = await this.lead_management.updateMany(
                { lead_group_uuid },
                { $set: { lead_group_uuid: "" } }
            );

            // 2️⃣ Delete related records from leads_queue collection
            const deleteResult = await this.leads_in_queue.deleteMany({
                lead_group_uuid
            });

            Logger.verbose(`Leads unassigned ==> ${updateResult.modifiedCount}`);
            Logger.verbose(`Queue records deleted ==> ${deleteResult.deletedCount}`);

            if (updateResult.modifiedCount > 0 || deleteResult.deletedCount > 0) {
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.OK,
                    'Leads unassigned and queue records deleted successfully'
                );
            } else {
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.NOT_FOUND,
                    'No leads found'
                );
            }

        } catch (error) {
            Logger.error(
                `Error in catch block ===> removeAllLeads()`,
                error.message
            );
        }
    }

    /*
    @Usage                 : To export all leads based on given lead group
    @Param lead_group_uuid : uuid of lead group
    @return Object : Success / Error
    */

    async exportLeadsWithDetails ( lead_group_uuid: string, queryParams ) {
        const { name, timezone } = queryParams;
        try {
            // Set the response headers for CSV download
            const file = `${name}.csv`;
            const filePath = `${process.env.UPLOAD_DIRECTORY}${file}`;
            if ( fs.existsSync( filePath ) ) fs.unlinkSync( filePath ); // unlink file if the file exists

            let totalLeads = await this.lead_management.find( { lead_group_uuid } ).count().exec();
            let loopCounter = Math.ceil( totalLeads / 1000 ); // [Get data in Batch of 1000 leads]
            // let loopCounter = 2; // [Batch delete of 1000 leads]
            let i, skip, limit = 1000, result;

            // let populateFields = [{ path: "user", select: "username" }, { path: "disposition", select: 'name -_id' },
            // { path: "cdrs_details", select: 'billsecond createdAt -_id', options: { sort: { createdAt: -1 }, limit: 1 } }
            // ];
            let populateFields = [ { path: "user", select: "username" }, { path: "country", select: 'country nicename -_id -uuid' }, { path: "disposition", select: 'name -_id -disposition_uuid' }, { path: "campaign_details", select: 'name -_id -uuid' }, { path: "blended_campaign_details", select: 'name -_id -uuid' }, { path: "inbound_campaign_details", select: 'name -_id -uuid' }, { path: "disposition", select: 'name -_id' },
            { path: "cdrs_details", select: 'billsecond createdAt -_id', options: { sort: { createdAt: -1 }, limit: 1 } }
            ];

            if ( totalLeads > 0 ) {
                for ( i = 0; i < loopCounter; i++ ) {
                    skip = i * limit;
                    result = await this.lead_management.find( { lead_group_uuid }, { call_count: 1, lead_status: 1, user_uuid: 1, createdAt: 1, lead_management_uuid: 1, first_name: 1, last_name: 1, phone_code: 1, phone_number: 1, _id: 0 } ).populate( populateFields ).limit( limit ).skip( skip ).lean().exec();

                    result = result.map((item: any) => {
                        if ((!item.campaign_details || item.campaign_details.length === 0)) {
                            if (item.blended_campaign_details && item.blended_campaign_details.length > 0) {
                                item.campaign_details = item.blended_campaign_details;
                            } else if (item.inbound_campaign_details && item.inbound_campaign_details.length > 0) {
                                item.campaign_details = item.inbound_campaign_details;
                            }
                        }
                        return item;
                    });

                    this.addDataToCsv( filePath, result, name, timezone );
                }
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, 'Leads exported successfully' );
            } else {
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, 'No leads found' );
            }
        } catch ( error ) {
            Logger.error( `Error in catch block ==>`, error.message );
        }
    }

    /*
    @Usage                 : To add data into CSV in chunk
    @Param filePath        : path of file from where file will be downloaded
    @Param result          : data to insert into CSV
    @Param leadGroupName   : name of lead group
    @return Object         : Success / Error
    */

    addDataToCsv ( filePath, result, leadGroupName, timezone ) {
        // Check if the file exists
        if ( !fs.existsSync( filePath ) ) {
            // Create the file if it doesn't exist
            fs.writeFileSync( filePath, '' );
        }

        // Create a writable stream in append mode
        const stream = fs.createWriteStream( filePath, { flags: 'a' } );

        // Write the CSV header if the file is empty
        if ( fs.statSync( filePath ).size === 0 ) {
            // const header = 'First Name,Last Name,Phone Code,Phone Number,Lead Group,Last Called Username,Called Count,Lead Status,Call duration,Last Call Date,Lead Entry Date\n';
            const header = 'First Name,Last Name,Phone Code,Phone Number,Lead Group,Last Called Username,Campaign,Gender,Description,Country,Address,City,State,Province,Postal Code,DOB,Alternative Phone Number,Email,Called Count,Lead Status,Call duration,Last Call Date,Lead Entry Date\n';
            stream.write( header );
        }

        // Write each data object as a CSV row
        let leadEntryDate, cdrsLastCallDate;
        result.forEach( ( item ) => {
            leadEntryDate = moment( new Date( item.createdAt ) ).tz( timezone ).format( "YYYY-MM-DD HH:mm:ss" );
            cdrsLastCallDate = item.cdrs_details[ 0 ]?.createdAt == undefined ? "" : moment( new Date( item.cdrs_details[ 0 ]?.createdAt ) ).tz( timezone ).format( "YYYY-MM-DD HH:mm:ss" );

            // const row = `${item.first_name},${item.last_name},${item.phone_code},${item.phone_number},${leadGroupName},${(item.user[0]?.username) == undefined ? "" : item.user[0]?.username},${item.call_count},${item.disposition[0]?.name},${(item.cdrs_details[0]?.billsecond) == undefined ? 0 : item.cdrs_details[0]?.billsecond},${cdrsLastCallDate},${leadEntryDate}\n`;
            // stream.write(row);
            const row = `${item.first_name},${item.last_name},${item.phone_code},${item.phone_number},${leadGroupName},${( item.user[ 0 ]?.username ) == undefined ? "" : item.user[ 0 ]?.username},${( item.campaign_details[ 0 ]?.name ) == undefined ? "" : item.campaign_details[ 0 ].name},${( item.gender == undefined ) ? "" : item.gender},${( item.description == undefined ) ? "" : item.description},${( item.country[ 0 ]?.name ) == undefined ? "" : item.country[ 0 ]?.name},${( item.address == undefined ) ? "" : item.description},${( item.city == undefined ) ? "" : item.city},${( item.state == undefined ) ? "" : item.state},${( item.province == undefined ) ? "" : item.province},${( item.postal_code == undefined ) ? "" : item.postal_code},${( item.dob == undefined ) ? "" : item.dob},${( item.alternate_phone_number == undefined ) ? "" : item.alternate_phone_number},${( item.email == undefined ) ? "" : item.email},${item.call_count},${item.disposition[ 0 ]?.name},${( item.cdrs_details[ 0 ]?.billsecond ) == undefined ? 0 : item.cdrs_details[ 0 ]?.billsecond},${cdrsLastCallDate},${leadEntryDate}\n`;
            stream.write( row );
        } );

        // Close the stream
        stream.end();
    }

    async getCampaignList(queryParams) {
        // console.log("queryyypapapapappappapapa", queryParams);
        // const { manager_uuid, assigned_manager_role, tenant_uuid } = queryParams;
        let finalArray = {};
        // if (manager_uuid != "" && manager_uuid != undefined && assigned_manager_role != undefined) {
        //     finalArray = await this.getCampaignsForManagerAgent(assigned_manager_role, tenant_uuid, manager_uuid);
        // } else {
        let outboundCampaigns = await this.commonDbFn.findAllWithPagination(this.outbound_campaign, queryParams, "", "", { _id: -1 }, true, true);
        let voiceBroadcast = await this.commonDbFn.findAllWithPagination(this.voice_broadcast, queryParams, "", "", { _id: -1 }, true, true);
        let blendedCampaigns = await this.commonDbFn.findAllWithPagination(this.blended_campaign, queryParams, "", "", { _id: -1 }, true, true);

        if (outboundCampaigns.statusCode == 200) {
            delete outboundCampaigns.statusCode;
            finalArray["outbound_campaign"] = outboundCampaigns.data;
        }

        if (voiceBroadcast.statusCode == 200) {
            delete voiceBroadcast.statusCode;
            finalArray["voiceBroadcast"] = voiceBroadcast.data;
        }

        if (blendedCampaigns.statusCode == 200) {
            delete blendedCampaigns.statusCode;
            finalArray["blended_campaign"] = blendedCampaigns.data;
        }
        // }
        let statusCode = (finalArray["outbound_campaign"] != undefined && finalArray["outbound_campaign"].length == 0) && (finalArray["voiceBroadcast"] != undefined && finalArray["voiceBroadcast"].length == 0) && (finalArray["blended_campaign"] != undefined && finalArray["blended_campaign"].length == 0) ? HttpStatus.NOT_FOUND : HttpStatus.OK;
        return this.commonDbFn.sendResponseWithMessage(statusCode, finalArray);
    }
}
