import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateDncDto } from "../dto/create-dnc.dto";
import * as fs from 'fs';
import { parseStream } from 'fast-csv';
import { DncDocument, DncSchema } from "../schema/dnc.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { DncImportDto } from "../dto/dnc-import.dto";

@Injectable()

export class DncService {

    /*
    @Usage              : To load dnc schema and other libraries
    @Param @InjectModel : It will load dnc schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [dnc,commonDbFn] 
    */

    constructor(
        @InjectModel(DncSchema.name) private readonly dnc: Model<DncDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
	private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new dnc will be created else it will throw error
    @Param createDncDto : Request paramter that we set into dto
    @return Object             : Success / Error 
    */

    async create(createDncDto: CreateDncDto) {
        const { phone_number, tenant_uuid } = createDncDto;
        let where = [{ phone_number }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "DNC already exist \n",
            logSuccessMsg: "DNC created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.dnc, where, createDncDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of dnc with data 
    */

    async findAll(queryParams) {
        let searchFields = ["phone_number","name"];
        let populateFields = [{ path: "tenant", select: 'username tenant_name'},{ path: "campaign", select: 'name' }];
        return this.commonDbFn.findAllWithPagination(this.dnc, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single dnc record based on uuid
    @Param uuid     : Search dnc by uuid
    @return Object  : Result of dnc 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `DNC not found by uuid : ${uuid} \n`,
            logSuccessMsg: `DNC success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.dnc, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createDncDto: CreateDncDto) {
        const { phone_number , tenant_uuid , global_status } = createDncDto;
        const getDnc = await this.dnc.findOne({ uuid }).exec();
        if (getDnc?.phone_number != phone_number) {
            const checkDncExist = await this.dnc.find({ $and:[{ phone_number },{ tenant_uuid }] }).count().exec();
            if (checkDncExist > 0) {
                Logger.error("DNC already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `DNC already exist`);
            }
        }

	//Check DNC global_status has been changed or not against phone number
        if (getDnc?.global_status != global_status) {
            try {
                let response = await this.lead_management.updateOne({ phone_number, tenant_uuid }, { in_dnc: "0" }).exec();
                if (response.modifiedCount > 0) {
                    Logger.debug(`DNC updated successfully with combination of phone_number : ${phone_number} & tenant_uuid : ${tenant_uuid}`);
                } else {
                    Logger.error(`Unable to update dnc in lead management`);
                }
            } catch (error) {
                Logger.error(`Error in catch block == DNC Update`,error.message);
            }
        }

        let logMessages = {
            logErrorMsg: `DNC not found by uuid : ${uuid} \n`,
            logSuccessMsg: `DNC updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.dnc,uuid,createDncDto,JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search dnc using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of dnc with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name'},{ path: "campaign", select: 'name' }];
        return this.commonDbFn.advancedSearch(this.dnc, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of dnc[Active/Inactive]
    @Param uuid    : uuid of dnc
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `DNC not found by uuid : ${uuid} \n`,
            logSuccessMsg: `DNC status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.dnc, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple dnc using uuid
    @Param uuid    : To delete single dnc pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `DNC not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `DNC deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.dnc, { uuid }, JSON.stringify(logMessages));
    }

    async importdnc ( postData: DncImportDto ) {
        let { file, tenant_uuid } = postData;
        let alldnc: any = await this.addCsvData( postData );
        alldnc.shift();

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
        let result, dncArr, csvchecckedarr, finaldnc_Arr, insertedRecords = 0, recordText, len;

        result = await this.dnc.find( { tenant_uuid }, { phone_number: 1, _id: 0 } ).exec();
        console.log( "R", result, result.length );
        dncArr = this.filterData( alldnc, result );





        const dncData = dncArr.map( ( { phone_number } ) => phone_number );
        const filtered = dncArr.filter( ( { phone_number }, index ) =>
            !dncData.includes( phone_number, index + 1 ) );
        csvchecckedarr = filtered;


        console.log( csvchecckedarr );


        finaldnc_Arr = csvchecckedarr;




        try {
            insertedRecords = finaldnc_Arr != undefined ? finaldnc_Arr.length : 0;
            if ( insertedRecords != 0 ) {
                await this.dnc.insertMany( finaldnc_Arr, { ordered: false } );
            }
        } catch ( error ) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink( `${process.env.UPLOAD_DIRECTORY}${file}`, ( result ) => {
            Logger.debug( `${file} file deleted` );
        } );
        len = alldnc?.length == 0 ? 0 : alldnc.length;
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}` );
    }

    async addCsvData ( postData ) {
        let { file, tenant_uuid, mapper_keys } = postData;


        //For telecom-ci import mapper
        if ( mapper_keys != undefined ) {
            mapper_keys = JSON.parse( mapper_keys );
        }

        let alldncs = [];
        let obj: any = {};
        return new Promise( function ( resolve, reject ) {
            const stream = fs.createReadStream( `${process.env.UPLOAD_DIRECTORY}${file}` );
            parseStream( stream )
                .on( 'error', error => console.error( error ) )
                .on( 'data', row => {
                    obj = {
                        tenant_uuid,
                        phone_number: row[ mapper_keys?.phone_number == undefined ? "0" : mapper_keys.phone_number ],
                        status: '0',
                        global_status: '0'
                    }
                    alldncs.push( obj );
                } )
                .on( 'end', async ( rowCount: number ) => {
                    console.log( alldncs )
                    resolve( alldncs );
                } );
        } );
    }

    filterData ( alldncs, result ) {
        let matched, dncArr = [];
        /*if(result.length == 0){
          leadArr.push(allLeads);
          return leadArr;
        }*/
        alldncs.map( ( data ) => {
            matched = result.filter( function ( el ) {
                return el.phone_number == data.phone_number
            } );
            if ( matched.length == 0 ) {
                dncArr.push( data );
            }
        } );
        return dncArr;
    }

}
