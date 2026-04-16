import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
// { CreateConferenceDto } from "../dto/create-conference.dto";
import { StickyAgentReportService } from "../services/sticky-agent-report.service";
import { Public } from "src/global_constant";

@Controller("sticky-agent-report")

/*@Usage : To provide title of API in swagger */
@ApiTags("Sticky Agent Report")
export class StickyAgentReportController {

    /*
    @Usage  : To load sticky_agent_report service and other libraries
    @return : Object[sticky_agent_report] 
    */

    constructor(private readonly sticky_agent_report: StickyAgentReportService) { }


    @Post("/advanced-search")
    @postDecoraters("Retrieved tenants successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search tenant
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of sticky_agent_report with data
    */

    advancedSearch(@Body() searchData) {
        return this.sticky_agent_report.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all Sticky Agent Report successfully", "List all Sticky Agent Report")

    /*
    @Usage  : List all StickyAgentReport
    @Method : GET
    @return : Array of an object with total count of StickyAgentReport with data
    */

    findAll(@Query() queryParam) {
        return this.sticky_agent_report.findAll(queryParam);
    }

   
    
    @Delete(':uuid')
    @deleteDecoraters("Sticky Agent Report deleted successfully", "Delete single or multiple Sticky Agent Report using uuid")

    /*
    @Usage               : Delete single or multiple StickyAgentReport using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single StickyAgentReport pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { StickyAgentReport deleted successfully / StickyAgentReport not found}
    */

    remove(@Param('uuid') id: string) {
        return this.sticky_agent_report.remove(id);
    }

   }