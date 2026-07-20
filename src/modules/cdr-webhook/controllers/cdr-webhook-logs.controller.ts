import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters } from "src/swagger/swagger_decoraters";
import { CdrWebhookService } from "../services/cdr-webhook.service";

@Controller("cdr-webhook-logs")
@ApiTags("CDR Webhook")
export class CdrWebhookLogsController {

    constructor(
        private readonly cdrWebhook: CdrWebhookService
    ) { }

    @Get()
    @getDecoraters("Retrieved webhook logs successfully", "List webhook delivery logs")

    /*
    @Usage               : List webhook delivery logs — always scoped to the caller's own
                            tenant, derived from the JWT (never from client-supplied query
                            params), so one tenant can never read another tenant's logs.
    @Method              : GET
    @Param webhook_uuid  : string
    @Param status        : string
    @Param limit         : number
    @Param skip          : number
    @return              : Array of delivery log entries with total count
    */

    findAll(@Query() query, @Req() req) {
        // Tenant-role JWTs carry the tenant's own uuid in `uuid` with no `parent_uuid`.
        // Manager-role JWTs carry the manager's own uuid in `uuid` and the owning
        // tenant's uuid in `parent_uuid` (see PassportLocalStrategy / master-admin
        // controller login). Prefer parent_uuid so manager logins scope correctly too.
        const tenantUuid = req.user?.parent_uuid || req.user?.uuid;
        return this.cdrWebhook.logs(query, tenantUuid);
    }
}
