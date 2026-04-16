import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateWebformDto } from "../dto/create-webform.dto";
import { WebformDocument, WebformSchema } from "../schema/webform.schema";
import { Model } from "mongoose";
import { deleteMethod, getMethod, putMethod } from "src/global_constant";

@Injectable()


export class WebformService {

    /*
    @Usage              : To load Webform schema and other libraries
    @Param @InjectModel : It will load Webform schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [Webform,commonDbFn] 
    */

    constructor(
        @InjectModel(WebformSchema.name) private readonly webform: Model<WebformDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                        : First it will check whether given name exist or not , if not then new Webform will be created else it will throw error
    @Param createWebformDto : Request paramter that we set into dto
    @return Object                : Success / Error 
    */

    async create(createWebformDto: CreateWebformDto) {
        const { name, tenant_uuid } = createWebformDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Webform already exist \n",
            logSuccessMsg: "Webform created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.webform, where, createWebformDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of Webform with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name", "description"];
        let populateFields = [{ path: "tenant", select: 'username tenant_name'}];
        return this.commonDbFn.findAllWithPagination(this.webform, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single webform based on uuid
    @Param uuid     : Search webform by uuid
    @return Object  : Result of Webform
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Webform not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Webform success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.webform, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

   async update(uuid: string, createWebformDto: CreateWebformDto) {
        const { name , tenant_uuid , description } = createWebformDto;
        const getWebform = await this.webform.findOne({ uuid }).exec();
        if (getWebform?.name != name) {
            const checkWebformExist = await this.webform.find({ $and:[{ name },{ tenant_uuid }] }).count().exec();
            if (checkWebformExist > 0) {
                Logger.error("Webform already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Webform already exist`);
            }
        }
         let logMessages = {
            logErrorMsg: `Webform not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Webform updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.webform,uuid,createWebformDto,JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search Webform using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of Webform with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.webform, searchParams);
    }

  
    /*
    @Usage         : Delete single or multiple Webform using uuid
    @Param uuid    : To delete single Webform pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

   async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Webform not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Webform deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.webform, { uuid }, JSON.stringify(logMessages));
    }
}
