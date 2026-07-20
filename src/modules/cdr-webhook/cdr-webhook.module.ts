import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CdrWebhookController } from "./controllers/cdr-webhook.controller";
import { CdrWebhookLogsController } from "./controllers/cdr-webhook-logs.controller";
import { CdrWebhookService } from "./services/cdr-webhook.service";

@Module({
    imports: [HttpModule],
    controllers: [CdrWebhookController, CdrWebhookLogsController],
    providers: [CdrWebhookService]
})
export class CdrWebhookModule { }
