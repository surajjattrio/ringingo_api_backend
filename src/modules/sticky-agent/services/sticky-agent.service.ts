import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateStickyAgentDto } from "../dto/create-sticky-agent.dto";
import { StickyAgentDocument, StickyAgentSchema } from "../schema/sticky-agent.schema";

@Injectable()

export class StickyAgentService {

    /*
    @Usage              : To load sticky_agent schema and other libraries
    @Param @InjectModel : It will load sticky_agent schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [sticky_agent,commonDbFn] 
    */

    constructor(
        @InjectModel(StickyAgentSchema.name) private readonly sticky_agent: Model<StickyAgentDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new sticky agent will be created else it will throw error
    @Param createStickyAgentDto : Request paramter that we set into dto
    @return Object             : Success / Error 
    */

    async create(createStickyAgentDto: CreateStickyAgentDto) {
        const { tenant_uuid,phone_number} = createStickyAgentDto;
        let where = [ { tenant_uuid },{ phone_number }];
        let logMessages = {
            logErrorMsg: "Sticky Agent already exist \n",
            logSuccessMsg: "Sticky Agent created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.sticky_agent, where , createStickyAgentDto, JSON.stringify(logMessages),"and");
    }



}
