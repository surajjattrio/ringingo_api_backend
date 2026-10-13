import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { ServerSyncService } from "../services/server-sync.service";
import { ExecuteSyncDto, ExportDataDto, ImportDataDto, PreviewSyncDto, ValidatePipelineDto } from "../dto/server-sync.dto";

@ApiTags("Server Data Sync")
@ApiBearerAuth()
@Controller("server-sync")
export class ServerSyncController {
    constructor(private readonly serverSyncService: ServerSyncService) { }

    /**
     * Get list of available servers and supported modules
     */
    @UseGuards(AuthGuard("jwt"))
    @Get("servers")
    async getServers() {
        return this.serverSyncService.getAvailableServers();
    }

    /**
     * Validate pipeline connectivity between Source (Current Logged-in Server) and Target Server
     */
    @UseGuards(AuthGuard("jwt"))
    @Post("validate-pipeline")
    async validatePipeline(@Body() dto: ValidatePipelineDto) {
        return this.serverSyncService.validatePipeline(dto);
    }

    /**
     * Preview sync changes (Dry Run)
     */
    @UseGuards(AuthGuard("jwt"))
    @Post("preview")
    async previewSync(@Body() dto: PreviewSyncDto) {
        return this.serverSyncService.previewSync(dto);
    }

    /**
     * Get detailed record list for a specific module
     */
    @UseGuards(AuthGuard("jwt"))
    @Get("module-data")
    async getModuleData(
        @Query("module") module: string,
        @Query("source_server") source_server: string,
        @Query("target_server") target_server?: string,
        @Query("tenant_uuid") tenant_uuid?: string,
    ) {
        return this.serverSyncService.getModuleRecords(module as any, source_server, target_server, tenant_uuid);
    }

    /**
     * Execute server data synchronization
     */
    @UseGuards(AuthGuard("jwt"))
    @Post("execute")
    async executeSync(@Body() dto: ExecuteSyncDto, @Request() req: any) {
        const user = req?.user;
        return this.serverSyncService.executeSync(dto, user);
    }

    /**
     * Get synchronization history log with pagination
     */
    @UseGuards(AuthGuard("jwt"))
    @Get("history")
    async getHistory(@Query() queryParams: any) {
        return this.serverSyncService.getHistory(queryParams);
    }

    /**
     * Get specific sync history detail by ID
     */
    @UseGuards(AuthGuard("jwt"))
    @Get("history/:id")
    async getHistoryById(@Param("id") id: string) {
        return this.serverSyncService.getHistoryById(id);
    }

    /**
     * Inter-server export endpoint
     */
    @UseGuards(AuthGuard("jwt"))
    @Post("export-data")
    async exportData(@Body() dto: ExportDataDto) {
        return this.serverSyncService.exportData(dto);
    }

    /**
     * Inter-server import endpoint
     */
    @UseGuards(AuthGuard("jwt"))
    @Post("import-data")
    async importData(@Body() dto: ImportDataDto) {
        return this.serverSyncService.importData(dto);
    }
}
