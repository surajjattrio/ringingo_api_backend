import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RealtimeDashboardController } from "./controllers/realtime-dashboard.controller";
import { RealtimeDashboardService } from "./services/realtime-dashboard.service";
import { LeadManagementSchema, leadManagementSchema } from "../lead-management/schema/lead-management.schema";
import { LeadsInQueueSchema, leadsInQueueSchema } from "../lead-management/schema/leads-in-queue.schema";
import { LeadGroupSchema, leadGroupSchema } from "../lead-group/schema/lead-group.schema";
import { OutboundCampaignModule } from "../campaigns/outbound-campaign/outbound-campaign.module";
import { InboundCampaignModule } from "../campaigns/inbound-campaign/inbound-campaign.module";
import { BlendedCampaignModule } from "../campaigns/blended-campaign/blended-campaign.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: LeadManagementSchema.name, schema: leadManagementSchema },
            { name: LeadsInQueueSchema.name, schema: leadsInQueueSchema },
            { name: LeadGroupSchema.name, schema: leadGroupSchema },
        ]),
        OutboundCampaignModule,
        InboundCampaignModule,
        BlendedCampaignModule,
    ],
    controllers: [RealtimeDashboardController],
    providers: [RealtimeDashboardService],
    exports: [RealtimeDashboardService],
})
export class RealtimeDashboardModule { }
