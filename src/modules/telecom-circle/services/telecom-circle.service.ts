import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { TelecomCircleDto } from "../dto/telecom-circle.dto";
import { parseStream } from 'fast-csv';
import * as fs from 'fs';
import { TelcomCircleDocument, TelecomCircleSchema } from "../schema/telecom-circle.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { TelecomCircleImportDto } from "../dto/telecom-circle-import.dto";

@Injectable()

export class TelecomCircleService {
    /*
    @Usage              : To load user schema and other libraries
    @Param @InjectModel : It will load user schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [user,commonFn,commonDbFn]
    */

    constructor(
        @InjectModel( TelecomCircleSchema.name ) private readonly telecomcircle: Model<TelcomCircleDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions

    ) { }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of users with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "prefix","name" ];
        // let populateFields = [ { path: "tenant", select: 'tenant_name username' } ];
        return this.commonDbFn.findAllWithPagination( this.telecomcircle, queryParams, searchFields );
    }

    /*
    @Usage          : To get single telecom-circle record based on uuid
    @Param uuid     : Search telecom-circle by uuid
    @return Object  : Result of user
    */

    async findOne ( uuid: string ) {
        const telecom_circle = await this.telecomcircle.findOne( { uuid } ).exec();
        if ( telecom_circle == null ) {
            Logger.error( `Telecom-Circle not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Telecom-Circle not found" } )
        }
        Logger.debug( `Telecom-Circle success fetched by uuid : ${uuid} \n` );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, telecom_circle );
    }





    /*
    @Usage                 : First it will check whether given domain exist or not , if not then new tenant will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    async create ( telecomCircleDto: TelecomCircleDto ) {
        const { prefix, tenant_uuid } = telecomCircleDto;
        console.log(telecomCircleDto);
        let andQuery = [ { tenant_uuid },{prefix} ];
        // let where = { andQuery };
        let logMessages = {
            logErrorMsg: "telecom-circle / prefix already exist \n",
            logSuccessMsg: "Telecom-Circle created successfully \n"
        }
        return this.commonDbFn.findAndInsert( this.telecomcircle, andQuery, telecomCircleDto, JSON.stringify( logMessages ), "and" );
    }


    async update ( uuid: string, telecomCircleDto: TelecomCircleDto ) {

        const {  tenant_uuid,prefix } = telecomCircleDto;
        const gettelecomcircleData = await this.telecomcircle.findOne( { uuid } ).exec();

        if ( gettelecomcircleData?.prefix != prefix ) {
            const checktelecomcircleExist = await this.telecomcircle.find( { $and: [ { prefix, tenant_uuid } ] } ).count().exec();
            if ( checktelecomcircleExist > 0 ) {
                Logger.error( "Telecom-circle already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Telecom-Circle already exist` );
            }
        }

        let logMessages = {
            logErrorMsg: `Telecom-Circle not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Telecom-Circle updated successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.update( this.telecomcircle, uuid, telecomCircleDto, JSON.stringify( logMessages ) );

        if ( response.statusCode == 404 ) { return response; }

        return response;
    }

    /*
    @Usage         : Delete single or multiple telecom-circle using uuid
    @Param uuid    : To delete single telecom-circle pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Telecom-circle not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Telecom-circle deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.telecomcircle, { uuid }, JSON.stringify( logMessages ) );
    }


    /*
    @Usage              : To search users using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of users with data
    */

    async advancedSearch ( searchParams ) {
        // let populateFields = [  { path: "tenant", select: 'tenant_name username' } ];
        return this.commonDbFn.advancedSearch( this.telecomcircle, searchParams );
    }



    async importtelecomcircle ( postData: TelecomCircleImportDto ) {
        let { file, tenant_uuid } = postData;
        let alltelecomcircles: any = await this.addCsvData( postData );
        alltelecomcircles.shift();

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
        let result, telecomcircleArr, csvchecckedarr,finaltelecom_arr, insertedRecords = 0, recordText, len;

        result = await this.telecomcircle.find({tenant_uuid},{prefix:1,_id:0}).exec();
        console.log("R",result,result.length);
        telecomcircleArr = this.filterData(alltelecomcircles,result);




        
        const leadData = telecomcircleArr.map( ( { prefix } ) => prefix );
        const filtered = telecomcircleArr.filter( ( { prefix }, index ) =>
        !leadData.includes( prefix, index + 1 ) );
        csvchecckedarr = filtered;    
        
        
        console.log(csvchecckedarr);


        finaltelecom_arr = csvchecckedarr;


        

        try {
            insertedRecords = finaltelecom_arr != undefined ? finaltelecom_arr.length : 0;
            if ( insertedRecords != 0 ) {
                await this.telecomcircle.insertMany( finaltelecom_arr, { ordered: false } );
            }
        } catch ( error ) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink( `${process.env.UPLOAD_DIRECTORY}${file}`, ( result ) => {
            Logger.debug( `${file} file deleted` );
        } );
        len = alltelecomcircles?.length == 0 ? 0 : alltelecomcircles.length;
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}` );
    }


    async addCsvData ( postData ) {
        let { file, tenant_uuid, mapper_keys } = postData;


        //For telecom-circle import mapper
        if ( mapper_keys != undefined ) {
            mapper_keys = JSON.parse( mapper_keys );
        }

        let alltelecomcircles = [];
        let obj: any = {};
        return new Promise( function ( resolve, reject ) {
            const stream = fs.createReadStream( `${process.env.UPLOAD_DIRECTORY}${file}` );
            parseStream( stream )
                .on( 'error', error => console.error( error ) )
                .on( 'data', row => {
                    obj = {
                        tenant_uuid,
                        prefix:row[mapper_keys?.prefix == undefined ? "0" : mapper_keys.prefix],
                        name: row[ mapper_keys?.name == undefined ? "1" : mapper_keys.name ],
			status:'0'
                    }
                    alltelecomcircles.push( obj );
                } )
                .on( 'end', async ( rowCount: number ) => {
                    console.log(alltelecomcircles)
                    resolve( alltelecomcircles );
                } );
        } );
    }

    filterData ( allLeads, result ) {
        let matched, leadArr = [];
        /*if(result.length == 0){
          leadArr.push(allLeads);
          return leadArr;
        }*/
        allLeads.map( ( data ) => {
            matched = result.filter( function ( el ) {
                return el.prefix == data.prefix;
            } );
            if ( matched.length == 0 ) {
                leadArr.push( data );
            }
        } );
        return leadArr;
    }



}
