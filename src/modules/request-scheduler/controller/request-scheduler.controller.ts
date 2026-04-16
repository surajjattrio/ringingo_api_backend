import { Controller, Get, Query, Body, Post, Delete, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { RequestSchedulerService } from "../services/request-scheduler.service";

@Controller("request-scheduler")
@ApiTags("Request Scheduler")
export class RequestSchedulerController {
    constructor(
        private readonly requestSchedulerService: RequestSchedulerService
    ) { }

    /**
     * GET : Fetch all scheduled requests
     */
    @Get()
    @getDecoraters("Retrieved scheduled requests successfully", "Get all scheduled requests")

    findAll(@Query() queryParam: any) {
        return this.requestSchedulerService.findAll(queryParam);
    }

    /**
     * POST : Create a new scheduled request
     */
    @Post("/create")
    @postDecoraters("Request scheduled successfully", "Create request scheduler")

    async create(@Body() body: any) {
        // if (!body.mapping || Object.keys(body.mapping).length === 0) {
        //     throw new Error("Field mapping is required");
        // }
        return this.requestSchedulerService.create(body);
    }

    /**
     * ✅ POST : Delete scheduler request + csv
     */
    @Delete("/delete/:uuid")
    @postDecoraters("Scheduler request deleted successfully", "Delete scheduler request")

    delete(@Param('uuid') uuid: string) {
        return this.requestSchedulerService.deleteRequest(uuid);
    }
}
