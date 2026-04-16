import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { CdrsService } from "../services/cdrs.service";
import { CdrsArchiveService } from "../services/cdrs-archive.service";

@Controller("cdrs")

/*@Usage : To provide title of API in swagger */
@ApiTags("Cdrs")

export class CdrsController {

    /*
    @Usage  : To load cdrs service and other libraries
    @return : Object[cdrs]
    */

    constructor(private readonly cdrs: CdrsService, private readonly cdrsArchiveService: CdrsArchiveService) { }

    @Post("/advanced-search")
    @postDecoraters("Retrieved cdrs successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search cdrs
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of cdrs with data
    */

    advancedSearch(@Body() searchData) {
        return this.cdrs.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all cdrs successfully", "List all cdrs")

    /*
    @Usage  : List all cdrs
    @Method : GET
    @return : Array of an object with total count of cdrs with data
    */

    findAll(@Query() queryParam) {
        return this.cdrs.findAll(queryParam);
    }

    /**************** Agent & Tenant & Admin CDRs Dashboard Section *********************/

    @Get("/dashboard")
    @getDecoraters("Retrieved all cdrs for agent dashboard successfully", "List all cdrs for agent dashboard")

    /*
    @Usage  : List all cdrs for given entity dashboard
    @Method : GET
    @return : Array of an object with total count of cdrs depend on entity dashboard with data
    */

    getCallsData(@Req() req) {
        return this.cdrs.getCallsData(req.query);
    }

    @Get("/agent-today-stats")
    @getDecoraters("Retrieved agent today stats successfully", "Get today stats for agent")
    getAgentTodayStats(@Query() queryParam) {
        return this.cdrs.getAgentTodayStats(queryParam);
    }

    @Get("/dashboard/missed-call")
    @getDecoraters("Retrieved last 10 missed calls successfully", "List last 10 missed calls")

    /*
    @Usage  : List last 10 missed calls cdrs for given entity dashboard
    @Method : GET
    @return : Array of an object with total count of cdrs depend on entity dashboard with data
    */

    getMissedCallsData(@Req() req) {
        return this.cdrs.getMissedCallsData(req.query);
    }

    @Get("/ivr-group")
    @getDecoraters("Retrieved ivr-group successfully", "List ivr-group")

    /*
    @Usage  : List ivr-group  cdrs for given entity dashboard
    @Method : GET
    @return : Array of an object with total count of cdrs depend on entity dashboard with data
    */

    getIvrGroupData(@Req() req, @Query() queryParam) {
        return this.cdrs.getIvrGroupData(queryParam);
    }

    @Get("/quartely-archive")
    @getDecoraters("Archived quartely CDRS successfully", "Archived quartely CDRS")

    /*
    @Usage          : Archived quartely CDRS
    @Method         : GET
    @return         : Array of an object with total count of archived CDRs depend on quarter
    */

    quarterlyArchive(@Req() req) {
        return this.cdrsArchiveService.quarterlyArchive();
    }

    @Get("/quartely-archived-collections")
    @getDecoraters("Quarterly archived CDRS collections successfully", "Quarterly archived CDRS collections CDRS")

    /*
    @Usage          : CDRS Quartely archived collection list
    @Method         : GET
    @return         : Array of an object with total count of quartely archived list
    */

    quarterlyArchivedCollections(@Req() req) {
        return this.cdrsArchiveService.quarterlyArchivedCollections();
    }

    @Post("/cdrs-archive-year-to-quarter")
    @postDecoraters("Archived quartely CDRS successfully for one year", "Archived quartely CDRS for one year")

    /*
    @Usage          : Archive one year CDRs data in quarterly created collection
    @Method         : POST
    @return         : Archieve one year CDRs data in quarterly created collection list
    */

    cdrsDataArchiveToQuarterBasedOnYear(@Body() data) {
        return this.cdrsArchiveService.cdrsDataArchiveToQuarterBasedOnYear(data);
    }

    @Post("/zoho-cdrs")
    @postDecoraters("Retrieved cdrs successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search cdrs
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of cdrs with data
    */

    zohoadvancedSearch(@Body() searchData) {
        return this.cdrs.zohoadvancedSearch(searchData);
    }

    @Post('/check-disposition')
    @postDecoraters("Check phone number within disposition range successfully", "check phone number disposition")

    /*
    @Usage               : Check phone number within disposition range
    @Method              : POST
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Phone number params will receive here
    @return string       : Check phone number within disposition range successfully
    */

    checkDisposition(@Body() phoneNumberDto: any, @Req() req,) {
        let { phoneNumber } = phoneNumberDto;
        return this.cdrs.checkDispoCount(phoneNumber);
    }
    
    @Get("/csat-report")
    @getDecoraters("Retrieved CSAT report successfully", "Get CSAT report")
    csatReport(@Query() queryParam) {
        return this.cdrs.csatReport(queryParam);
    }

    @Post("/export-csv")
    exportCsv(@Body() searchData, @Res() res) {
        return this.cdrs.streamAdvancedSearchCsv(searchData, res);
    }
}
