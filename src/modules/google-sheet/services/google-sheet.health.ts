import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class GoogleSheetHealthService implements OnModuleInit {
    private connected = false;
    private lastError: string | null = null;

    constructor(@Inject('GOOGLE_SHEET_QUEUE') private readonly client: ClientProxy) { }

    async onModuleInit() {
        const RABBITMQ_URL = process.env.RABBITMQ_URL?.replace(/^\"|\"$/g, '');
        if (!RABBITMQ_URL) {
            this.connected = false;
            this.lastError = 'RABBITMQ_URL is not set';
            console.warn('[GoogleSheetHealth]: Skipping RabbitMQ client connect because RABBITMQ_URL is not set');
            return;
        }

        try {
            await this.client.connect();
            this.connected = true;
            this.lastError = null;
            console.log('[GoogleSheetHealth]: Connected to RabbitMQ client');
        } catch (err) {
            this.connected = false;
            this.lastError = err?.message || String(err);
            console.error('[GoogleSheetHealth]: Failed to connect to RabbitMQ client', this.lastError);
        }
    }

    getStatus() {
        const RABBITMQ_URL = process.env.RABBITMQ_URL?.replace(/^\"|\"$/g, '');
        return {
            connected: this.connected,
            RABBITMQ_URL: RABBITMQ_URL ? RABBITMQ_URL : null,
            reason: this.lastError,
        };
    }
}
