import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoogleSheetService } from './google-sheet.service';

@Injectable()
export class GoogleSheetCron {
    private readonly logger = new Logger(GoogleSheetCron.name);

    constructor(private readonly service: GoogleSheetService) { }

    // Runs at every 3rd minute.
    @Cron('*/3 * * * *')
    async handleCron() {
        const enabled = process.env.CRON_SETUP === 'false';
        if (enabled) {
            return this.logger.log('GoogleSheetCron is disabled via env variable');
        } else {
            this.logger.log('[GoogleSheetCron] Cron job started');
            try {
                await this.service.callGoogleSheetCron();
                this.logger.log('[GoogleSheetCron] Cron job completed successfully');
            } catch (err) {
                this.logger.error('[GoogleSheetCron] Cron job failed:', err?.message || err);
            }
        }
    }
}
