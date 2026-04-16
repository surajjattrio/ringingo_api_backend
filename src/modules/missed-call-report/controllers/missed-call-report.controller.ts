import { Body, Controller, Get, Param, Post, Query, Req, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { MissedcallreportService } from "../services/missed-call-report.service";

@Controller( "missed-call-report" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Missed Call Report" )

export class MissedcallreportController {

    /*
    @Usage  : To load user performance report service and other libraries
    @return : Object[cdrs]
    */

    constructor( private readonly missed_call_report: MissedcallreportService ) { }

    @Get()
    @getDecoraters( "Retrieved all missed call report successfully", "List all missed call report" )

    /*
    @Usage  : List all user performance report
    @Method : GET
    @return : Array of an object with total count of user performance report with data
    */

    findAll ( @Query() queryParam ) {
        return this.missed_call_report.findAll( queryParam );
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
        return this.missed_call_report.advancedSearch( searchData );
    }


}



