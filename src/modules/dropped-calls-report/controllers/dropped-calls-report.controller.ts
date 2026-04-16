import { Body, Controller, Get, Param, Post, Query, Req, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { DroppedCallsReportService } from "../services/dropped-calls-report.service";

@Controller( "dropped-calls-report" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Dropped Calls Report" )

export class DroppedCallsReportController {

    /*
    @Usage  : To load dropped calls report service and other libraries
    @return : Object[cdrs]
    */

    constructor( private readonly dropped_calls_report: DroppedCallsReportService ) { }

    @Get()
    @getDecoraters( "Retrieved all dropped calls report successfully", "List all dropped calls report" )

    /*
    @Usage  : List all dropped calls report
    @Method : GET
    @return : Array of an object with total count of dropped calls report with data
    */

    findAll ( @Query() queryParam ) {
        return this.dropped_calls_report.findAll( queryParam );
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
        return this.dropped_calls_report.advancedSearch( searchData );
    }

}