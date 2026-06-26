import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoogleSheetService } from './google-sheet.service';
import { SampannGoogleSheetService } from './google-sheet-sampan_new.service';

@Injectable()
export class GoogleSheetCron {
    private readonly logger = new Logger(GoogleSheetCron.name);

    constructor(
        private readonly service: GoogleSheetService,
        private readonly sampann_service: SampannGoogleSheetService
    ) { }

    // Runs at every 3rd minute.
    @Cron('*/1 * * * *')
    async handleCron() {
        if (process.env.CRON_SETUP === 'true') {
            return this.logger.log('GoogleSheetCron is disabled via env variable');
        }

        this.logger.log('[GoogleSheetCron] Cron job started');

        const results = await Promise.allSettled([
            // this.service.callGoogleSheetCron(),
            this.sampann_service.callGoogleSheetCron(),
        ]);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const serviceName = index === 0 ? 'service' : 'sampann_service';
                this.logger.error(`[GoogleSheetCron] ${serviceName} data failed:`, result.reason?.message || result.reason);
            }
        });

        this.logger.log('[GoogleSheetCron] Cron job completed');
    }
}
