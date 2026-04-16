import { Body, Controller, Get, Param, Post, Query, Req, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { CallQueueReportService } from "../services/call-queue-report.service";

@Controller( "call-queue-report" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Call Queue Report" )

export class CallQueueReportController {

    /*
    @Usage  : To load call queue report service and other libraries
    @return : Object[cdrs]
    */

    constructor( private readonly call_queue_report: CallQueueReportService ) { }

    @Get()
    @getDecoraters( "Retrieved all call queue report successfully", "List all call queue report" )

    /*
    @Usage  : List all call queue report
    @Method : GET
    @return : Array of an object with total count of call queue report with data
    */

    findAll ( @Query() queryParam ) {
        return this.call_queue_report.findAll( queryParam );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved cdrs successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search cdrs
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of cdrs with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.call_queue_report.advancedSearch( searchData );
    }

}