import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
    PipelineStageSchema, pipelineStageSchema,
    PipelineLeadSchema, pipelineLeadSchema,
    PipelineAssignmentConfigSchema, pipelineAssignmentConfigSchema,
} from "./schema/pipeline.schema";
import { LeadManagementSchema, leadManagementSchema } from "../lead-management/schema/lead-management.schema";
import { DispositionSchema, dispositionSchema } from "../disposition/schema/disposition.schema";
import { OutboundCampaignSchema, outboundCampaignSchema } from "../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignSchema, blendedCampaignSchema } from "../campaigns/blended-campaign/schema/blended-campaign.schema";
import { InboundCampaignSchema, inboundCampaignSchema } from "../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { LeadGroupSchema, leadGroupSchema } from "../lead-group/schema/lead-group.schema";
import { UserSchema, userSchema } from "../user/schema/user.schema";
import { PipelineController } from "./controllers/pipeline.controller";
import { PipelineService } from "./services/pipeline.service";
import { PipelineAutoImportService } from "./services/pipeline-auto-import.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PipelineStageSchema.name, schema: pipelineStageSchema },
            { name: PipelineLeadSchema.name,  schema: pipelineLeadSchema  },
            { name: PipelineAssignmentConfigSchema.name, schema: pipelineAssignmentConfigSchema },
            { name: LeadManagementSchema.name, schema: leadManagementSchema },
            { name: DispositionSchema.name,    schema: dispositionSchema },
            { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
            { name: BlendedCampaignSchema.name,  schema: blendedCampaignSchema },
            { name: InboundCampaignSchema.name,  schema: inboundCampaignSchema },
            { name: LeadGroupSchema.name,        schema: leadGroupSchema },
            { name: UserSchema.name,             schema: userSchema },
        ]),
    ],
    controllers: [PipelineController],
    providers:   [PipelineService, PipelineAutoImportService],
    exports:     [MongooseModule, PipelineAutoImportService],
})
export class KanbanModule {}

