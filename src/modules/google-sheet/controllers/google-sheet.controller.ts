import { Controller, Post, Get, Body, Req, Param, Delete, Headers, Query, Res } from '@nestjs/common';
import { Public } from 'src/global_constant';
import { GoogleSheetService } from '../services/google-sheet.service';
import { SampannGoogleSheetService } from '../services/google-sheet-sampan_new.service';
import { CreateGoogleCredentialDto } from '../dto/google-credential.dto';
// import { GoogleSheetProducer } from '../services/google-sheet.producer';
// import { GoogleSheetHealthService } from '../services/google-sheet.health';

@Controller('google-sheet')
export class GoogleSheetController {
    constructor(
        private readonly sheetsService: GoogleSheetService,
        private readonly sheets_service: SampannGoogleSheetService
        // private readonly producer: GoogleSheetProducer,
        // private readonly health: GoogleSheetHealthService,
    ) { }

    @Public()
    @Get('/auric/fetch-data')
    async getData() {
        await this.sheetsService.fetchSheetData();
        return { statusCode: 201, message: 'Google Sheet sync completed' };
    }

    /**
     * Triggers parallel sync of all tabs across every active Google Sheet configuration.
     * Idempotent — safe to call multiple times without creating duplicates.
     */
    @Public()
    @Get('/auric/sync-all-tabs')
    async syncAllTabs() {
        const result = await this.sheets_service.syncAllTabsFromAllActiveSheets();
        return {
            statusCode: 200,
            message: 'Parallel tab sync completed',
            data: result,
        };
    }

    /** Save Google Service Account credentials */
    @Public()
    @Post('credentials')
    async saveCredentials(@Body() dto: CreateGoogleCredentialDto) {
        const [mainService, sampannService] = await Promise.allSettled([
            this.sheetsService.createCredential(dto),
            this.sheets_service.createCredential(dto)
        ]);
        return { mainService, sampannService };
    }

    /** Generate access token using credentials from MongoDB */
    @Get('access-token')
    async generateAccessToken() {
        const result = await this.sheetsService.generateAccessToken();
        return result;
    }

    @Public()
    @Get('list')
    async listGoogleSheets() {
        const result = await this.sheetsService.listGoogleSheets();
        return result;
    }

    // @Public()
    // @Post('sync')
    // async sync() {
    //     const emitted = await this.producer.syncTodayData();
    //     return { message: 'Google Sheet sync completed', emitted };
    // }

    // @Public()
    // @Post('emit-test')
    // async emitTest() {
    //     const ok = await this.producer.emitTest();
    //     return { message: ok ? 'test emitted' : 'test failed', ok };
    // }

    // @Get('rabbit-status')
    // async getStatus() {
    //     // return this.health.getStatus();
    //     const result = this.health.getStatus();
    //     return { message: result.connected ? 'Connected to RabbitMQ' : 'Not connected to RabbitMQ', ok: result.connected };
    // }
}
