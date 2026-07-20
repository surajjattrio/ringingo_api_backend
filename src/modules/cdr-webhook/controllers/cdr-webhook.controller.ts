import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateCdrWebhookDto } from "../dto/create-cdr-webhook.dto";
import { UpdateCdrWebhookDto } from "../dto/update-cdr-webhook.dto";
import { CdrWebhookService } from "../services/cdr-webhook.service";

@Controller("cdr-webhook")

/*@Usage : To provide title of API in swagger */
@ApiTags("CDR Webhook")

export class CdrWebhookController {

    /*
    @Usage  : Proxies webhook config/logs requests to the ringingo-fs-cdr microservice
    @return : Object[cdrWebhook]
    */

    constructor(
        private readonly cdrWebhook: CdrWebhookService
    ) { }

    @Get()
    @getDecoraters("Retrieved all webhooks successfully", "List all webhooks for a tenant")

    /*
    @Usage             : List all webhooks — always scoped to the caller's own tenant,
                          derived from the JWT (never from client-supplied query
                          params), so one tenant can never read another tenant's
                          webhook configs.
    @Method            : GET
    @Param is_active   : boolean
    @Param webhook_type: string
    @Param name        : string (partial, case-insensitive)
    @Param transform_strategy : string
    @Param method      : string
    @return            : Array of webhook configs
    */

    findAll(@Query() query, @Req() req) {
        // Tenant-role JWTs carry the tenant's own uuid in `uuid` with no `parent_uuid`.
        // Manager-role JWTs carry the manager's own uuid in `uuid` and the owning
        // tenant's uuid in `parent_uuid` — prefer parent_uuid so manager logins scope
        // correctly too (same derivation as CdrWebhookLogsController).
        const tenantUuid = req.user?.parent_uuid || req.user?.uuid;
        return this.cdrWebhook.list(query, tenantUuid);
    }

    @Get("/:id")
    @getDecoraters("Retrieved webhook successfully", "List single webhook using uuid")

    findOne(@Param("id") id: string) {
        return this.cdrWebhook.getOne(id);
    }

    @Post()
    @postDecoraters("Webhook created successfully", "Create a new webhook")

    create(@Body() createCdrWebhookDto: CreateCdrWebhookDto) {
        return this.cdrWebhook.create(createCdrWebhookDto);
    }

    @Put("/:id")
    @putDecoraters("Webhook updated successfully", "Update single webhook using uuid")

    update(@Param("id") id: string, @Body() updateCdrWebhookDto: UpdateCdrWebhookDto) {
        return this.cdrWebhook.update(id, updateCdrWebhookDto);
    }

    @Delete("/:id")
    @deleteDecoraters("Webhook deleted successfully", "Delete single webhook using uuid")

    remove(@Param("id") id: string) {
        return this.cdrWebhook.remove(id);
    }

    @Post("/:id/test")
    @postDecoraters("Webhook test triggered successfully", "Manually test a webhook")

    test(@Param("id") id: string, @Body() body: any) {
        return this.cdrWebhook.test(id, body);
    }

    @Get("/stats/summary")
    @getDecoraters("Retrieved webhook stats successfully", "Get webhook delivery statistics")

    stats() {
        return this.cdrWebhook.stats();
    }
}
