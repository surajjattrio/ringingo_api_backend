import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ActivityLogService } from "../services/activity-log.service";
import { ApiTags } from "@nestjs/swagger";
import { SetUUIDInterceptor } from "src/interceptor/logged-in-user-info.interceptor";

@ApiTags("Activity Log")
@Controller("activity-log")
export class ActivityLogController {
    constructor(private readonly activityLogService: ActivityLogService) { }

    @Get()
    @UseInterceptors(SetUUIDInterceptor)
    findAll(@Query() query: any) {
        return this.activityLogService.findAll(query);
    }
}
