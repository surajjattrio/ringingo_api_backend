import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookCron {
    private readonly logger = new Logger(WebhookCron.name);

    constructor(private readonly service: WebhookService) { }

    // Runs at every 3rd minute 
    // @Cron('*/3 * * * *')
    // async handleCron() {
    //     const enabled = process.env.CRON_SETUP === 'false';
    //     if (enabled) {
    //         return this.logger.log('WebhookCron is disabled via env variable');
    //     } else {
    //         this.logger.log('[WebhookCron] Cron job started');
    //         try {
    //             await this.service.get1financeWebhookData();
    //             this.logger.log('[WebhookCron] Cron job completed successfully');
    //         } catch (err) {
    //             this.logger.error('[WebhookCron] Cron job failed:', err?.message || err);
    //         }
    //     }
    // }
}
