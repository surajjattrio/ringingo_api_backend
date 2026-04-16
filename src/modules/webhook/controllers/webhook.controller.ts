import { Controller, Get } from "@nestjs/common";
import { WebhookService } from "../services/webhook.service";

@Controller("webhook")
export class WebhookController {

    constructor(private readonly webhook: WebhookService,) { }

    @Get("/1finance")
    get1financeWebhookData() {
        return this.webhook.get1financeWebhookData();
    }
}
