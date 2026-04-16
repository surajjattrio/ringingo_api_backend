import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateStickyAgentDto } from "../dto/create-sticky-agent.dto";
import { StickyAgentService } from "../services/sticky-agent.service";

@Controller("sticky-agent")

/*@Usage : To provide title of API in swagger */
@ApiTags("Sticky Agent")
export class StickyAgentController {

    /*
    @Usage  : To load sticky-agent service and other libraries
    @return : Object[sticky-agent] 
    */

    constructor(private readonly sticky_agent: StickyAgentService) { }

    @Post()
    @postDecoraters("Sticky Agent created successfully", "Create a new Sticky Agent")

    /*
    @Usage                          : To create new Sticky Agent
    @Method                         : POST
    @Param routing_uuid             : string
    @Param did_type                 : string
    @Param caller_id                : string
    @Param tenant_uuid              : string
    @Param destination              : string
    @Param user_uuid                : string
    @return success / error object  : { Sticky Agent created successfully / Sticky Agent already exist}
    */

    create(@Body() createStickyAgentDto: CreateStickyAgentDto) {
        return this.sticky_agent.create(createStickyAgentDto);
    }

 
}