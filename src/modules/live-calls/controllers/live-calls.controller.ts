import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters } from "src/swagger/swagger_decoraters";
import { LiveCallsService } from "../services/live-calls.service";

@Controller("live-calls")

/*@Usage : To provide title of API in swagger */
@ApiTags("Live Calls")

export class LiveCallsController {

    /*
    @Usage  : To load tenant service and other libraries
    @return : Object[tenant] 
    */

    constructor(private readonly live_calls : LiveCallsService) { }

    @Get()
    @getDecoraters("Retrieved all live calls successfully", "List all live calls")

    /*
    @Usage  : List all live calls
    @Method : GET
    @return : Array of an object with total count of live calls with data
    */

    getLiveCalls(@Query() queryParam) {
        return this.live_calls.getLiveCalls(queryParam);
    }
}