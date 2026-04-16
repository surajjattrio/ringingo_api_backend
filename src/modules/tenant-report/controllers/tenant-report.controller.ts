import { Controller, Delete, Get, Param, Req , Res , Query, ParseUUIDPipe, Body, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { TenantreportService } from '../services/tenant-report.service';
import * as path from "path";
import { Public } from "src/global_constant";
// import { LeadreportDto } from "../dto/create-lead-report.dto";

@Controller("tenant_report")

/*@Usage : To provide title of API in swagger */
@ApiTags("Tenant_report")

export class TenantreportController {

    constructor(private readonly tenant_report: TenantreportService) { }


    @Get()
    @getDecoraters("Retrieved all cdrs successfully", "List all cdrs")

    /*
    @Usage  : List all cdrs
    @Method : GET
    @return : Array of an object with total count of cdrs with data
    */

    findAll(@Query() queryParam) {
        return this.tenant_report.findAll(queryParam);
    }

    /*
    @Usage  : List all Tenantreport tenant vise
    @Method : GET
    @return : Array of an object with total count of Tenantreport with data
    */

    @Get(':tenant_uuid')
    @getDecoraters("Lead Report successfully", "Lead Report")


    /*
    @Usage                          : Lead Report
    @Method                         : POST
    @Param count                    : string
    @Param disposition_count        : string
    @return success / error object  : { Lead Report successfully / Lead Report already exist}
    */

    tenantreport(@Param('tenant_uuid', new ParseUUIDPipe({ version: '4' })) id: string,) {
        return this.tenant_report.tenantreport(id);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved user performance report successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search user performance report
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of user performance report with data
    */

    advancedSearch(@Body() searchData) {
        return this.tenant_report.advancedSearch(searchData);
    }

    @Post("/tenant_report_search")
    @postDecoraters("Retrieved tenant report successfully", "search for single or multiple filed")

    /*
    @Usage             : To search tenant report
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of tenant report with data
    */
    searchTenant(@Body() newsearchData) {
	    // console.log("NEW SEARCH");
        // console.log(newsearchData);
        return this.tenant_report.searchTenant(newsearchData);
    }

    @Get("/check/flag-status")
    @getDecoraters("Retrieved all tenant flag status successfully", "List all flag status")

    /*
    @Usage  : List all flag status
    @Method : GET
    @return : Array of an object with total count of flag status with data
    */

    checkflagstatus(@Query() queryParam) {
        return this.tenant_report.checkflagstatus(queryParam);
    }

}

