import { Controller, Get, Query, Body, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { CampaignReportService } from '../services/campaign-report.service';

@Controller("campaign-report")

/*@Usage : To provide title of API in swagger */
@ApiTags("Campaign Report")

export class CampaignReportController {

    constructor(private readonly campaign_report: CampaignReportService) { }


    @Get()
    @getDecoraters("Retrieved all campaign report successfully", "List all campaign report")

    /*
    @Usage  : List all campaign report
    @Method : GET
    @return : Array of an object with total count of campaign report with data
    */

    findAll(@Query() queryParam) {
        return this.campaign_report.findAll(queryParam);
    }

    @Post("/campaign-report-search")
    @postDecoraters("Retrieved campaign report successfully", "search for single or multiple filed")

    /*
    @Usage             : To search campaign report
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of campaign report with data
    */
    searchCampaign(@Body() searchedData) {
        return this.campaign_report.searchCampaign(searchedData);
    }
}


