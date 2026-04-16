import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateAdminIpMappingDto } from "../dto/create-admin-ip-mapping.dto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { InjectModel } from "@nestjs/mongoose";
import { AdminIpMappingDocument, AdminIpMappingSchema } from "../schema/admin-ip-mapping.schema";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";


@Injectable()

export class AdminIpMappingService {
    commonFn: any;

    /*
    @Usage              : To load admin ip mapping schema and other libraries
    @Param @InjectModel : It will load admin ip mapping schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [admin_ip_mapping,commonFn,commonDbFn] 
    */

   constructor(
        @InjectModel(AdminIpMappingSchema.name) private readonly admin_ip_mapping: Model<AdminIpMappingDocument>,
        private readonly commonDbFn: CommonDBFunctions,
	
    ) { }

   /*
    @Usage                          : First it will check whether given IP & Prefix exist or not , if not then new Admin Ip mapping will be created else it will throw error
    @Param createAdminIpMappingDto  : Request paramter that we set into dto
    @return Object                  : Success / Error 
    */


    async create(createAdminIpMappingDto: CreateAdminIpMappingDto) {
        const { ip, prefix  } = createAdminIpMappingDto;
        let where = [{ ip }, { prefix } ];
        let logMessages = {
            logErrorMsg: "Admin IP mapping already exist \n",
            logSuccessMsg: "Admin IP mapping created successfully \n"
        }

        return this.commonDbFn.findAndInsert(this.admin_ip_mapping, where, createAdminIpMappingDto, JSON.stringify(logMessages), "and");


     }     


    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of admin ip mapping with data 
    */

     async findAll(queryParams) {
        let searchFields = ["ip", "prefix"];
        return this.commonDbFn.findAllWithPagination(this.admin_ip_mapping, queryParams, searchFields);
    }

    /*
    @Usage          : To get single admin ip mapping record based on uuid
    @Param uuid     : Search admin ip mapping by uuid
    @return Object  : Result of admin ip mapping 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Admin IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Admin IP mapping success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.admin_ip_mapping, uuid, JSON.stringify(logMessages));
    }

 /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update admin ip mapping by uuid
    @Param createAdminIpMappingDto  : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createAdminIpMappingDto: CreateAdminIpMappingDto) {
        const { ip, prefix  } = createAdminIpMappingDto;
        const getAdminIpMapping = await this.admin_ip_mapping.findOne({ uuid }).exec();
        if (getAdminIpMapping?.ip != ip || getAdminIpMapping?.prefix != prefix) {
            const checkAdminIpMappingExist = await this.admin_ip_mapping.find({ $and: [ { ip }, { prefix }  ] }).count().exec();
            if (checkAdminIpMappingExist > 0) {
                Logger.error("Admin IP mapping already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Admin IP mapping already exist`);
            }
        }

    let logMessages = {
            logErrorMsg: `Admin IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Admin IP mapping updated successfully by uuid : ${uuid} \n`
        }

        return this.commonDbFn.update(this.admin_ip_mapping,uuid,createAdminIpMappingDto,JSON.stringify(logMessages));

	 }
      

     /*
    @Usage              : To search admin ip mapping using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of admin ip mapping with data 
    */  


    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.admin_ip_mapping, searchParams);
    }


    /*
    @Usage         : To update status of Admin IP mapping[Active/Inactive]
    @Param uuid    : uuid of admin ip mapping
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Admin IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Admin IP mapping status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.admin_ip_mapping, uuid, body, JSON.stringify(logMessages));
    }


     /*
    @Usage         : Delete single or multiple Admin IP mapping using uuid
    @Param uuid    : To delete single Admin IP mapping pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */


    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Admin IP mapping not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Admin IP mapping deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.admin_ip_mapping, { uuid }, JSON.stringify(logMessages));

     }
}