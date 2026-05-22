import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommonModule } from "../common/common.module";
import { InboundCampaignSchema, inboundCampaignSchema } from "../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { CallQueueSchema, callQueueSchema } from "../call-queue/schema/call-queue.schema";
import { CallQueueAgentSchema, callQueueAgentSchema } from "../call-queue/schema/call-queue-agent.schema";
import { ExtensionSchema, extensionSchema } from "../extension/schema/extension.schema";
import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";
import { UserSchema, userSchema } from "../user/schema/user.schema";
import { AgentLiveReportSchema, agentLiveReportSchema } from "../call-center/schema/agent-live-report.schema";
import { AgentCampaignLoginSchema, agentCampaignLoginSchema } from "../call-center/schema/agent-campaign-login.schema";
import { InboundCallDebugController } from "./inbound-call-debug.controller";
import { InboundCallDebugService } from "./inbound-call-debug.service";

@Module( {
    imports: [
        CommonModule,
        MongooseModule.forFeature( [
            { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
            { name: CallQueueSchema.name, schema: callQueueSchema },
            { name: CallQueueAgentSchema.name, schema: callQueueAgentSchema },
            { name: ExtensionSchema.name, schema: extensionSchema },
            { name: TenantSchema.name, schema: tenantSchema },
            { name: UserSchema.name, schema: userSchema },
            { name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
            { name: AgentCampaignLoginSchema.name, schema: agentCampaignLoginSchema },
        ] ),
    ],
    controllers: [ InboundCallDebugController ],
    providers: [ InboundCallDebugService ],
} )
export class InboundCallDebugModule {}
