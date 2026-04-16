import { Controller, Get, Query, Body, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { OmniChannelReportService } from "../services/omni-channel-report.service";

@Controller("omni-channel-report")
@ApiTags("Omni Channel Report")
export class OmniChannelReportController {
  constructor(
    private readonly omniChannelReportService: OmniChannelReportService
  ) {}

  /**
   * GET : Fetch all users by tenant_uuid
   */
  @Get()
  @getDecoraters(
    "Retrieved omni-channel users successfully",
    "Get all omni-channel users"
  )
  findAll(@Query() queryParam: any) {
    return this.omniChannelReportService.findAllUsers(queryParam);
  }

  /**
   * POST : Search omni-channel users
   */
  @Post("/omni-channel-report-search")
  @postDecoraters(
    "Retrieved omni-channel users successfully",
    "Search omni-channel users"
  )
  search(@Body() searchedData: any) {
    return this.omniChannelReportService.searchUsers(searchedData);
  }
}
