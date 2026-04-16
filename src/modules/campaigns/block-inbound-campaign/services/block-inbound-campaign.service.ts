import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateInboundBlockCampaignDto } from "../dto/create-inbound-block-campaign.dto";
import { BlockInboundCampaignDocument, BlockInboundCampaignSchema } from "../schema/block-inbound-campaign.schema";
import { putMethod } from "src/global_constant";
import { HttpStatus, Logger } from "@nestjs/common";
import * as fs from 'fs';
import { parseStream } from 'fast-csv';
import { BlockInboundCampaignImportDto } from "../dto/block-inbound-campaign-import.dto";

export class BlockInboundCampaignService {

    /*
    @Usage              : To load block inbound campaign schema and other libraries
    @Param @InjectModel : It will load block inbound campaign schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [conference,commonDbFn]
    */

    constructor(
        @InjectModel( BlockInboundCampaignSchema.name ) private readonly block_inbound_campaign: Model<BlockInboundCampaignDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new block inbound campaign will be created else it will throw error
    @Param createInboundBlockCampaignDto : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createInboundBlockCampaignDto: CreateInboundBlockCampaignDto ) {
        const { name, tenant_uuid } = createInboundBlockCampaignDto;
        let where = [ { name }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "Block inbound campaign already exist \n",
            logSuccessMsg: "Block inbound campaign created successfully \n"
        }
        return this.commonDbFn.findAndInsert( this.block_inbound_campaign, where, createInboundBlockCampaignDto, JSON.stringify( logMessages ), "and" );
    }


    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of block inbound campaign with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "name", "type_value" ];
        return this.commonDbFn.findAllWithPagination( this.block_inbound_campaign, queryParams, searchFields );
    }

    /*
    @Usage          : To get single block inbound campaign record based on uuid
    @Param uuid     : Search block inbound campaign by uuid
    @return Object  : Result of block inbound campaign
    */

    async findOne ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Block inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Block inbound campaign success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne( this.block_inbound_campaign, uuid, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                               : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                          : Update block inbound campaign by uuid
    @Param createInboundBlockCampaignDto : Request parameters for update
    @return Object                       : Success / Error
    */

    async update ( uuid: string, createInboundBlockCampaignDto: CreateInboundBlockCampaignDto ) {
        const { name, tenant_uuid } = createInboundBlockCampaignDto;
        const getBlockInboundCampaign = await this.block_inbound_campaign.findOne( { uuid } ).exec();
        if ( getBlockInboundCampaign?.name != name ) {
            const checkBlockInboundCampaignExist = await this.block_inbound_campaign.find( { $and: [ { name }, { tenant_uuid } ] } ).count().exec();
            if ( checkBlockInboundCampaignExist > 0 ) {
                Logger.error( "Block inbound campaign already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Block inbound campaign already exist` );
            }
        }
        let logMessages = {
            logErrorMsg: `Block inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Block inbound campaign updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.block_inbound_campaign, uuid, createInboundBlockCampaignDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search block inbound campaign using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of block inbound campaign with data
    */

    async advancedSearch ( searchParams ) {
        return this.commonDbFn.advancedSearch( this.block_inbound_campaign, searchParams );
    }

    /*
    @Usage         : To update status of block inbound campaign[Active/Inactive]
    @Param uuid    : uuid of block inbound campaign
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Block inbound campaign not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Block inbound campaign status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.block_inbound_campaign, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple block inbound campaign using uuid
    @Param uuid    : To delete single block inbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Block inbound campaign not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Block inbound campaign deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.block_inbound_campaign, { uuid }, JSON.stringify( logMessages ) );
    }

    async importblockinboundcampaign ( postData: BlockInboundCampaignImportDto ) {
        let { file, tenant_uuid } = postData;
        let allblockinboundcampaign: any = await this.addCsvData( postData );
        allblockinboundcampaign.shift();

        /*let result;
            let filterName = filter_by == "0" ? "Lead group" : "Tenant";
            Logger.warn(`Importing leads .... , Filter applied by : ${filterName}`);
            if (filter_by == "0") { // Filter by lead group
                result = await this.lead_management.find({ lead_group_uuid }, { phone_number: 1, _id: 0 }).exec();
            } else { // Filter by Tenant
                result = await this.lead_management.find({ tenant_uuid }, { phone_number: 1, _id: 0 }).exec();
            }
            let matched, leadArr = [];
            allLeads.map((data) => {
                matched = result.filter(function (el) {
                    return el.phone_number == data.phone_number;
                });
                if (matched.length == 0) {
                    leadArr.push(data);
                }
            });

            let insertedRecords = 0, recordText;
            try {
                await this.lead_management.insertMany(leadArr, { ordered: false });
                insertedRecords = leadArr.length;
            } catch (error) {
                insertedRecords = error.result.nInserted;
            }*/

        //Variable declaration
        let result, blockinboundcampaignArr, csvchecckedarr, finalblockinboundcampaign_arr, insertedRecords = 0, recordText, len;

        result = await this.block_inbound_campaign.find( { tenant_uuid }, { type_value: 1, _id: 0 } ).exec();
        console.log( "R", result, result.length );
        blockinboundcampaignArr = this.filterData( allblockinboundcampaign, result );





        const blockinboundcampaignData = blockinboundcampaignArr.map( ( { type_value } ) => type_value );
        const filtered = blockinboundcampaignArr.filter( ( { type_value }, index ) =>
            !blockinboundcampaignData.includes( type_value, index + 1 ) );
        csvchecckedarr = filtered;


        console.log( csvchecckedarr );


        finalblockinboundcampaign_arr = csvchecckedarr;




        try {
            insertedRecords = finalblockinboundcampaign_arr != undefined ? finalblockinboundcampaign_arr.length : 0;
            if ( insertedRecords != 0 ) {
                await this.block_inbound_campaign.insertMany( finalblockinboundcampaign_arr, { ordered: false } );
            }
        } catch ( error ) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink( `${process.env.UPLOAD_DIRECTORY}${file}`, ( result ) => {
            Logger.debug( `${file} file deleted` );
        } );
        len = allblockinboundcampaign?.length == 0 ? 0 : allblockinboundcampaign.length;
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}` );
    }

    async addCsvData ( postData ) {
        let { file, tenant_uuid, mapper_keys } = postData;


        //For telecom-ci import mapper
        if ( mapper_keys != undefined ) {
            mapper_keys = JSON.parse( mapper_keys );
        }

        let allblockinboundcampaigns = [];
        let obj: any = {};
        return new Promise( function ( resolve, reject ) {
            const stream = fs.createReadStream( `${process.env.UPLOAD_DIRECTORY}${file}` );
            parseStream( stream )
                .on( 'error', error => console.error( error ) )
                .on( 'data', row => {
                    obj = {
                        tenant_uuid,
                        name: row[ mapper_keys?.name == undefined ? "0" : mapper_keys.name ],
                        type_value: row[ mapper_keys?.type_value == undefined ? "1" : mapper_keys.type_value ],
                        status: '0',
                        type: '1'
                    }
                    allblockinboundcampaigns.push( obj );
                } )
                .on( 'end', async ( rowCount: number ) => {
                    console.log( allblockinboundcampaigns )
                    resolve( allblockinboundcampaigns );
                } );
        } );
    }

    filterData ( allblockinboundcampaigns, result ) {
        let matched, blockinboundcampaignArr = [];
        /*if(result.length == 0){
          leadArr.push(allLeads);
          return leadArr;
        }*/
        allblockinboundcampaigns.map( ( data ) => {
            matched = result.filter( function ( el ) {
                return el.type_value == data.type_value
            } );
            if ( matched.length == 0 ) {
                blockinboundcampaignArr.push( data );
            }
        } );
        return blockinboundcampaignArr;
    }
}
