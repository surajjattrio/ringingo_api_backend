import { Controller, Delete, Get, Param, Req, Res, Query, ParseUUIDPipe, Body, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { LeadreportService } from '../services/lead-report.service';
import * as path from "path";
import { Public } from "src/global_constant";

@Controller( "lead_report" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Lead_report" )

export class LeadreportController {

    constructor( private readonly lead_report: LeadreportService ) { }

    /*
    @Usage  : List all Leadreport
    @Method : GET
    @return : Array of an object with total count of Leadreport with data
    */

    @Get( ':lead_group_uuid' )
    @getDecoraters( "Lead Report successfully", "Lead Report" )


    /*
    @Usage                          : Lead Report
    @Method                         : POST
    @Param count                    : string
    @Param disposition_count        : string
    @return success / error object  : { Lead Report successfully / Lead Report already exist}
    */

    leadreport ( @Param( 'lead_group_uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Query() queryParams) {
        return this.lead_report.leadreport( id  , queryParams);
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved user performance report successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search user performance report
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of user performance report with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.lead_report.advancedSearch( searchData );
    }

    @Get()
    @getDecoraters( "Retrieved all Lead Report successfully", "List all Lead Report" )

    /*
    @Usage  : List all cdrs
    @Method : GET
    @return : Array of an object with total count of lead report with data
    */

    findAll ( @Query() queryParam ) {
        return this.lead_report.findAll( queryParam );
    }

}

