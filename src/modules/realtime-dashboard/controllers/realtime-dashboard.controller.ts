import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters } from "src/swagger/swagger_decoraters";
import { RealtimeDashboardService } from "../services/realtime-dashboard.service";

@Controller("realtime-dashboard")
@ApiTags("Realtime Dashboard")

export class RealtimeDashboardController {

    constructor(private readonly realtimeDashboardService: RealtimeDashboardService) { }

    /*
    @Usage  : Get lead group-wise realtime statistics
    @Method : GET
    @Query  : tenant_uuid, campaign_uuid?, lead_group_uuid?
    @return : Lead group stats with summary totals
    */

    @Get("lead-group-stats")
    @getDecoraters("Get lead group realtime stats", "Lead group realtime statistics")
    getLeadGroupStats(@Query() queryParams) {
        return this.realtimeDashboardService.getLeadGroupStats(queryParams);
    }
}
