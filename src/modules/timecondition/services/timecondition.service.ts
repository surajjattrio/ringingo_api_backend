import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateTimeconditionDto } from "../dto/create-timecondition.dto";
import { TimeconditionDocument, TimeconditionSchema } from "../schema/timecondition.schema";

@Injectable()


export class TimeconditionService {
    /*
    @Usage              : To load timecondition schema and other libraries
    @Param @InjectModel : It will load timecondition schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [timecondition,commonDbFn] 
    */

    constructor(
        @InjectModel(TimeconditionSchema.name) private readonly timecondition: Model<TimeconditionDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                        : First it will check whether given name exist or not , if not then new timecondition will be created else it will throw error
    @Param createTimeconditionDto : Request paramter that we set into dto
    @return Object                : Success / Error 
    */

    async create(createTimeconditionDto: CreateTimeconditionDto) {

        const { name } = createTimeconditionDto;
        let logMessages = {
            logErrorMsg: "Timecondition already exist \n",
            logSuccessMsg: "Timecondition created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.timecondition, { name }, createTimeconditionDto, JSON.stringify(logMessages));
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of timecondition with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name"];
        let populateFields = [{ path: "tenant", select: 'username tenant_name' } ,{ path: "user", select: 'username' } ];
        return this.commonDbFn.findAllWithPagination(this.timecondition, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single timecondition record based on uuid
    @Param uuid     : Timecondition uuid
    @return Object  : Result of timecondition 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Timecondition not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Timecondition success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.timecondition, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                        : Check name which comes in request for update already exist or not with that tenant, if not it will update else it will throw error
    @Param uuid                   : Update time condition by uuid
    @Param createTimeconditionDto : Request parameters for update
    @return Object                : Success / Error 
    */

    async update(uuid: string, createTimeconditionDto: CreateTimeconditionDto) {

        const { name, tenant_uuid } = createTimeconditionDto;
        const getTimecondition = await this.timecondition.findOne({ uuid }).exec();

        if (getTimecondition?.name != name) {
            const checkTimeconditionExist = await this.timecondition.find({ name, tenant_uuid }).count().exec();
            if (checkTimeconditionExist > 0) {
                Logger.error("Timecondition already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Timecondition already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Timecondition not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Timecondition updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.timecondition,uuid,createTimeconditionDto,JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple timecondition using uuid
    @Param uuid    : To delete single timecondition pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Timecondition not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Timecondition deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.timecondition, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search timecondition using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of timecondition with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name' } ,{ path: "user", select: 'username' } ];
        return this.commonDbFn.advancedSearch(this.timecondition, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of timecondition[Active/Inactive]
    @Param uuid    : uuid of timecondition
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Timecondition not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Timecondition status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.timecondition, uuid, body, JSON.stringify(logMessages));
    }


}