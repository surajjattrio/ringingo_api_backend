import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { GoogleSheetService } from './google-sheet.service';

@Injectable()
export class GoogleSheetProducer {
    constructor(
        private readonly sheetService: GoogleSheetService,
        @Inject('GOOGLE_SHEET_QUEUE') private readonly client: ClientProxy,
    ) { }

    private async ensureClientConnected() {
        try {
            // console.log('[GoogleSheetProducer] Attempting to connect RMQ client...');
            await this.client.connect();
            console.log('[GoogleSheetProducer] RMQ client connected successfully');
        } catch (err) {
            console.error('[GoogleSheetProducer] RMQ client connect failed:', err?.message || err);
            throw err;
        }
    }

    async syncTodayData(): Promise<number> {
        try {
            await this.ensureClientConnected();
        } catch (err) {
            console.error('[GoogleSheetProducer] Failed to ensure RMQ connection, aborting sync');
            return 0;
        }

        const rows = await this.sheetService.fetchSheetData();
        console.log('[GoogleSheetProducer] fetched rows count:', rows?.length || 0);

        const dateColumnIndex = parseInt(process.env.GOOGLE_SHEET_DATE_COLUMN_INDEX || '7', 10);
        const today = new Date();
        const isSameLocalDay = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();

        let emitted = 0;
        let filtered = 0;

        for (const row of rows) {
            const raw = row && row[dateColumnIndex];
            if (!raw) {
                console.log('[GoogleSheetProducer] skipping row, date column empty:', row[0]);
                continue;
            }

            const parsed = new Date(raw);
            if (isNaN(parsed.getTime())) {
                console.log('[GoogleSheetProducer] skipping row, invalid date:', raw, 'row:', row[0]);
                continue;
            }

            if (!isSameLocalDay(parsed, today)) {
                filtered++;
                continue;
            }

            const sheetDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;

            // console.log('[GoogleSheetProducer] emitting row, sheetDate=%s, name=%s, token=%s', sheetDate, row[0], row[2]);

            try {
                const payload = { row, sheetDate };
                // console.log('[GoogleSheetProducer] payload to emit:', JSON.stringify({ sheetDate, row_name: row[0], row_token: row[2] }));

                const obs = this.client.emit('google.sheet.process', payload);

                obs.subscribe({
                    next: () => {
                        // console.log('[GoogleSheetProducer] emit.next called');
                    },
                    error: (err) => {
                        console.error('[GoogleSheetProducer] emit error:', err?.message || err);
                    },
                    complete: () => {
                        // console.log('[GoogleSheetProducer] emit complete');
                    },
                });

                emitted++;
            } catch (err) {
                console.error('[GoogleSheetProducer] emit try-catch error:', err?.message || err);
            }
        }

        // console.log('[GoogleSheetProducer] sync complete - emitted=%d, filtered=%d, total=%d', emitted, filtered, rows.length);
        // console.log('[GoogleSheetProducer] syncTodayData finished', rows);
        return emitted;
    }

    async emitTest(): Promise<boolean> {
        await this.ensureClientConnected();
        const today = new Date();
        const sheetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const payload = { row: ['TEST', '000', 'test-token'], sheetDate };

        try {
            const obs = this.client.emit('google.sheet.process', payload);
            await lastValueFrom(obs);
            // console.log('[GoogleSheetProducer]: emitTest complete');
            return true;
        } catch (err) {
            console.error('[GoogleSheetProducer]: emitTest error', err?.message || err);
            return false;
        }
    }
}
