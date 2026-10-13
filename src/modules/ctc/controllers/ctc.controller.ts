import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { Public } from "src/global_constant";
import { TokenOrApiKeyAuthGuard } from "src/modules/auth/token_or_api_key_auth_guard";
import { CreateCtcDto } from "../dto/create-ctc.dto";
import { CtcService } from "../services/ctc.service";

@Controller("ctc")

/*@Usage : To provide title of API in swagger */
@ApiTags("CTC (Click To Call Dialer)")

export class CtcController {

    /*
    @Usage  : To load ctc service and other libraries
    @return : Object[ctc]
    */

    constructor(private readonly ctc: CtcService) { }

    @Public()
    @UseGuards(TokenOrApiKeyAuthGuard)
    @Post("dial")
    @postDecoraters("Call placed successfully", "Bridge a tenant agent (extension or trunk) to a customer number")

    /*
    @Usage                          : Place a click-to-call - rings the agent (extension or trunk) first/second
                                       depending on callfirst, then bridges it to the customer. Agent login state
                                       is intentionally never checked.
    @Method                         : POST
    @Param agent_number             : string
    @Param agent_type               : extension | trunk
    @Param agent_trunk              : string [required when agent_type=trunk]
    @Param customer_number          : string
    @return success / error object  : { Call placed successfully / Call failed }
    @Auth                           : Validates "Authorization: Bearer <JWT>" if present, else requires "x-api-key"
                                       (a tenant's static key from POST /api-key) - see TokenOrApiKeyAuthGuard.
    */

    dial(@Body() createCtcDto: CreateCtcDto) {
        return this.ctc.dial(createCtcDto);
    }

    @Public()
    @UseGuards(TokenOrApiKeyAuthGuard)
    @Get("dial")
    @getDecoraters("Call placed successfully", "Same as POST /ctc/dial, as a plain GET so the call can be triggered by just hitting a URL (e.g. from a CRM click-to-call button)")

    /*
    @Usage                          : Same bridge as POST /ctc/dial, exposed as GET so an external system can
                                       trigger a call by hitting one URL with query params + either the tenant's
                                       Bearer token or a static "x-api-key" header.
    @Method                         : GET
    @Param agent_number             : string
    @Param agent_type               : extension | trunk
    @Param agent_trunk              : string [required when agent_type=trunk]
    @Param customer_number          : string
    @return success / error object  : { Call placed successfully / Call failed }
    @Auth                           : Validates "Authorization: Bearer <JWT>" if present, else requires "x-api-key"
                                       (a tenant's static key from POST /api-key) - see TokenOrApiKeyAuthGuard.
    */

    dialGet(@Query() queryParam: CreateCtcDto) {
        return this.ctc.dial(queryParam);
    }

    @Get("history")
    @getDecoraters("Retrieved CTC history successfully", "Recent click-to-call dial attempts for this tenant")

    /*
    @Usage             : Recent click-to-call attempts for the logged-in tenant (newest first)
    @Method            : GET
    @Param limit        : number [optional, default 50]
    @return Object     : Array of ctc call attempts
    */

    history(@Query() queryParam) {
        return this.ctc.history(queryParam?.tenant_uuid, queryParam);
    }
}
