import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import {StickyAgentDocument,StickyAgentSchema} from "src/modules/sticky-agent/schema/sticky-agent.schema";

@Injectable()

export class StickyAgentReportService {

    /*
    @Usage              : To load sticky-agent-report schema and other libraries
    @Param @InjectModel : It will load sticky-agent-report schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [sticky-agent-report,commonDbFn] 
    */

    constructor(

        @InjectModel(StickyAgentSchema.name) private readonly sticky_agent: Model<StickyAgentDocument>,

        private readonly commonDbFn: CommonDBFunctions,
	private readonly commonFn: CommonFunctions,
    ) { }


    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of sticky-agent-report with data 
    */

    async findAll(queryParams) {
          let searchFields = ["phone_number"];
        let populateFields = [{ path: "user", select: 'username' }];
        return this.commonDbFn.findAllWithPagination(this.sticky_agent, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single StickyAgentReport record based on uuid
    @Param uuid     : Search StickyAgentReport by uuid
    @return Object  : Result of StickyAgentReport 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `StickyAgentReport not found by uuid : ${uuid} \n`,
            logSuccessMsg: `StickyAgentReport success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.sticky_agent, uuid, JSON.stringify(logMessages));
    }

   
    /*
    @Usage              : To search StickyAgentReport using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of StickyAgentReport with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "user", select: 'username' }];
        return this.commonDbFn.advancedSearch(this.sticky_agent, searchParams, populateFields);
    }

  

    /*
    @Usage         : Delete single or multiple StickyAgentReport using uuid
    @Param uuid    : To delete single StickyAgentReport pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `StickyAgentReport not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `StickyAgentReport deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.sticky_agent, { uuid }, JSON.stringify(logMessages));
    }

   }