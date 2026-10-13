import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PipelineService } from "../services/pipeline.service";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import {
    CreatePipelineLeadDto,
    CreatePipelineStageDto,
    ImportPipelineLeadsDto,
    UpdatePipelineLeadDto,
    UpdatePipelineStageDto,
    UpsertAssignmentConfigDto,
    DistributeExistingLeadsDto,
    BulkDeletePipelineLeadsDto,
    BulkUpdatePipelineLeadsDto,
} from "../dto/pipeline.dto";

@Controller("pipeline")
@ApiTags("Pipeline")
export class PipelineController {

    constructor(private readonly pipelineService: PipelineService) {}

    /* ═══════════════════════════════════════
       STAGE ENDPOINTS
    ═══════════════════════════════════════ */

    @Post("stage")
    @postDecoraters("Stage created successfully", "Create a new pipeline stage")
    createStage(@Body() dto: CreatePipelineStageDto) {
        return this.pipelineService.createStage(dto);
    }

    @Get("stage")
    @getDecoraters("Stages retrieved successfully", "Get all pipeline stages with leads")
    findAllStages(@Query() query: any) {
        return this.pipelineService.findAllStages(query);
    }

    @Put("stage/:uuid")
    @putDecoraters("Stage updated successfully", "Update a pipeline stage")
    updateStage(
        @Param("uuid", new ParseUUIDPipe({ version: "4" })) uuid: string,
        @Body() dto: UpdatePipelineStageDto,
    ) {
        return this.pipelineService.updateStage(uuid, dto);
    }

    @Delete("stage/:uuid")
    @deleteDecoraters("Stage deleted successfully", "Delete a pipeline stage and its leads")
    deleteStage(@Param("uuid", new ParseUUIDPipe({ version: "4" })) uuid: string) {
        return this.pipelineService.deleteStage(uuid);
    }

    /* ═══════════════════════════════════════
       LEAD ENDPOINTS
    ═══════════════════════════════════════ */

    @Post("lead")
    @postDecoraters("Lead created successfully", "Create a new pipeline lead")
    createLead(@Body() dto: CreatePipelineLeadDto) {
        return this.pipelineService.createLead(dto);
    }

    @Get("lead/:stageUuid")
    @getDecoraters("Leads retrieved successfully", "Get all leads by stage")
    findLeadsByStage(
        @Param("stageUuid", new ParseUUIDPipe({ version: "4" })) stageUuid: string,
        @Query() query: any,
    ) {
        return this.pipelineService.findLeadsByStage(stageUuid, query);
    }

    @Put("lead/:uuid")
    @putDecoraters("Lead updated successfully", "Update a pipeline lead")
    updateLead(
        @Param("uuid", new ParseUUIDPipe({ version: "4" })) uuid: string,
        @Body() dto: UpdatePipelineLeadDto,
    ) {
        return this.pipelineService.updateLead(uuid, dto);
    }

    @Patch("lead/:uuid/move")
    @putDecoraters("Lead moved successfully", "Move a lead to another stage")
    moveLead(
        @Param("uuid", new ParseUUIDPipe({ version: "4" })) uuid: string,
        @Body("stage_uuid") stageUuid: string,
    ) {
        return this.pipelineService.moveLead(uuid, stageUuid);
    }

    @Delete("lead/:uuid")
    @deleteDecoraters("Lead deleted successfully", "Soft-delete a pipeline lead")
    deleteLead(@Param("uuid", new ParseUUIDPipe({ version: "4" })) uuid: string) {
        return this.pipelineService.deleteLead(uuid);
    }

    @Post("lead/bulk-delete")
    @postDecoraters("Leads bulk deleted successfully", "Bulk soft-delete pipeline leads")
    bulkDeleteLeads(@Body() dto: BulkDeletePipelineLeadsDto) {
        return this.pipelineService.bulkDeleteLeads(dto.lead_uuids);
    }

    @Post("lead/bulk-update")
    @postDecoraters("Leads bulk updated successfully", "Bulk update campaign, lead group, assignee, or stage for pipeline leads")
    bulkUpdateLeads(@Body() dto: BulkUpdatePipelineLeadsDto) {
        return this.pipelineService.bulkUpdateLeads(dto);
    }


    /* ═══════════════════════════════════════
       BOARD VIEW
    ═══════════════════════════════════════ */

    @Get("board")
    @getDecoraters("Board view retrieved successfully", "Get full kanban board with stages and leads")
    getBoardView(@Query() query: any) {
        return this.pipelineService.getBoardView(query);
    }

    /* ═══════════════════════════════════════
       IMPORT LEADS
    ═══════════════════════════════════════ */

    @Post("import")
    @postDecoraters("Leads imported successfully", "Import leads from dispositions and lead group")
    importLeads(@Body() dto: ImportPipelineLeadsDto) {
        return this.pipelineService.importLeads(dto);
    }

    /* ═══════════════════════════════════════
       AUTO-ASSIGN CONFIG
    ═══════════════════════════════════════ */

    @Get("assignment-config")
    @getDecoraters("Assignment config retrieved", "Get auto-assign round-robin config for tenant")
    getAssignmentConfig(@Query("tenant_uuid") tenant_uuid: string) {
        return this.pipelineService.getAssignmentConfig(tenant_uuid);
    }

    @Put("assignment-config")
    @putDecoraters("Assignment config saved", "Save auto-assign round-robin config for tenant")
    upsertAssignmentConfig(@Body() dto: UpsertAssignmentConfigDto) {
        return this.pipelineService.upsertAssignmentConfig(dto);
    }

    @Post("distribute-existing")
    @postDecoraters("Existing leads distributed", "Distribute existing kanban leads across active users")
    distributeExistingLeads(@Body() dto: DistributeExistingLeadsDto) {
        return this.pipelineService.distributeExistingLeads(dto.tenant_uuid);
    }
}
