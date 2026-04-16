import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { DashboardService } from "../services/dashboard.service";
import { CallOverviewDto } from "../dto/call-overview.dto";
import { TenantCallOverviewDto } from "../dto/tenant-call-overview.dto";

@Controller("dashboard")

/*@Usage : To provide title of API in swagger */
@ApiTags("Dashboard")

export class DashboardController {

    constructor(private readonly dashboard: DashboardService) { }

    @Get(":feature")
    @getDecoraters("Retrieved all dashboard details", "List all dashboard details")

    /*
    @Usage  : List all data on admin dashboard
    @Method : GET
    @return : Array of an object with all dashboard details
    */


    getAdminDashboardDetails(@Param() param, @Query() queryParams) {
        let result;
        console.log("andnasdadasd",param);

        const { feature } = param;
        switch (feature) {
            case "refresh-live-calls":
                result = this.dashboard.getLiveCalls(true);
                break;
            case "refresh-total-extension":
                result = this.dashboard.getTotalRegisterExtension(true);
                break;
            case "refresh-top10-tenant":
                result = this.dashboard.getTop10Tenant(true,queryParams);
                break;
            case "refresh-recent10-tenant":
                result = this.dashboard.getRecent10Tenant(true,queryParams);
                break;
            case "refresh-call-overview":
                result = this.dashboard.getCallOverviewData(queryParams, true);
                break;
            default:
                result = this.dashboard.getAdminDashboardDetails(queryParams);
                break;
        }
        return result;
    }

    @Post("call-overview")
    @postDecoraters("Get call overview data", "Get call overview data")

    /*
    @Usage               : To get call overview data
    @Method              : POST
    @Param tenant_uuid   : string
    @Param start_date    : string
    @Param end_date      : string
    @return success / error object
    */

    getCallOverviewData(@Body() callOverviewDto: CallOverviewDto) {
        return this.dashboard.getCallOverviewData(callOverviewDto, true);
    }

    @Get("/filter/:feature")
    @getDecoraters("Retrieved details by usage/call", "List details by usage/call")

    /*
    @Usage               : To get details by usage/call
    @Method              : GET
    @return success / error object
    */

    filterByUsageOrCall(@Param() param,@Query() queryParam) {
        let result;
        const { feature } = param;
        switch (feature) {
            case "top10-tenant-usage":
                result = this.dashboard.getTop10TenantUsage(queryParam);
                break;
            case "top10-tenant-calls":
                result = this.dashboard.getTop10TenantCalls(queryParam);
                break;
            case "top10-tenant-users":
                result = this.dashboard.getTop10Tenant(true,queryParam);
                break;
            case "recent10-tenant-usage":
                result = this.dashboard.getRecent10TenantUsage(queryParam);
                break;
            case "recent10-tenant-calls":
                result = this.dashboard.getRecent10TenantCalls(queryParam);
                break;
            case "recent10-tenant-users":
                result = this.dashboard.getRecent10Tenant(true,queryParam);
                break;
        }
        return result;
    }

    /********** Tenant Dashboard Section *******************/

    @Get("tenant/:feature")
    @getDecoraters("Retrieved all dashboard details for tenant", "List all dashboard details for tenant")

    /*
    @Usage  : List all data on tenant dashboard
    @Method : GET
    @return : Array of an object with all dashboard details
    */

    getTenantDashboardDetails(@Param() param, @Query() queryParams) {
        let result;
        const { feature } = param;
        switch (feature) {
            case "refresh-live-calls":
                result = this.dashboard.getLiveCallsForTenant(true,queryParams);
                break;
            case "refresh-total-extension":
                result = this.dashboard.getTotalTenantExtension(true, queryParams);
                break;
            case "refresh-call-overview":
                result = this.dashboard.getCallOverviewDataForTenant(queryParams,true);
                break;
            case "refresh-top10-users":
                result = this.dashboard.getTop10Users(true, queryParams)
                break;
            case "refresh-recent10-users":
                result = this.dashboard.getRecent10Users(true, queryParams)
                break;
            case "refresh-managers":
                result = this.dashboard.getManagersData(queryParams);
                break;
            case "refresh-agents":
                result = this.dashboard.getAgentsData(queryParams);
                break;
            case "refresh-dids":
                result = this.dashboard.getDidData(queryParams);
                break;
            case "refresh-trunks":
                result = this.dashboard.getTrunkData(queryParams);
                break;
            case "refresh-inbound-campaigns":
                result = this.dashboard.getInboundCampaignData(queryParams);
                break;
            case "refresh-outbound-campaigns":
                result = this.dashboard.getOutboundCampaignData(queryParams);
                break;
            case "refresh-blended-campaigns":
                result = this.dashboard.getBlendedCampaignData(queryParams);
                break;
            default:
                result = this.dashboard.getTenantDashboardDetails(queryParams);
                break;
        }
        return result;
    }

    @Post("tenant/call-overview")
    @postDecoraters("Get call overview data", "Get call overview data")

    /*
    @Usage               : To get call overview data
    @Method              : POST
    @Param tenant_uuid   : string
    @Param start_date    : string
    @Param end_date      : string
    @return success / error object
    */

    getCallOverviewDataForTenant(@Body() tenantCallOverviewDto: TenantCallOverviewDto) {
        return this.dashboard.getCallOverviewDataForTenant(tenantCallOverviewDto, true);
    }

    @Get("/tenant/filter/:feature")
    @getDecoraters("Retrieved details by usage/call", "List details by usage/call")

    /*
    @Usage               : To get details of users by usage/call
    @Method              : GET
    @return success / error object
    */

    filterUserByUsageOrCall(@Param() param, @Query() queryParams) {
        let result;
        const { feature } = param;
        switch (feature) {
            case "top10-user-usage":
                result = this.dashboard.getTop10Users(true, queryParams);
                break;
            case "top10-user-calls":
                result = this.dashboard.getTop10UserCalls(true, queryParams);
                break;
            case "recent10-user-usage":
                result = this.dashboard.getRecent10Users(true, queryParams);
                break;
            case "recent10-user-calls":
                result = this.dashboard.getRecent10UserCalls(true, queryParams)
                break;
        }
        return result;
    }

    @Post("/tenant/account-details/:feature")
    @postDecoraters("Retrieved account details", "List details")

    /*
    @Usage               : To get details of Account Dashboard
    @Method              : POST
    @return success / error object
    */

    getAccountDashboardData(@Body() queryParams, @Param() param) {
        let result;
        const { feature } = param;
        switch (feature) {
            case "all":
                result = this.dashboard.getCardsCountData(queryParams);
                break;
            case "campaigns":
                result = this.dashboard.getCampaignData(queryParams);
                break;
            case "lead-groups":
                result = this.dashboard.getLeadGroupData(queryParams);
                break;
            case "call-queue":
                result = this.dashboard.getCallQueueData(queryParams);
                break;
            case "manager-and-agent":
                result = this.dashboard.getManagerAndAgentsData(queryParams);
                break;
            case "dids":
                result = this.dashboard.getDidsData(queryParams);
                break;
        }
        return result;
    }
}
