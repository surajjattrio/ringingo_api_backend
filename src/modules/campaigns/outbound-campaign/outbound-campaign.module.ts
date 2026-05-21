import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboundCampaignSchema, outboundCampaignSchema } from './schema/outbound-campaign.schema';
import { OutboundCampaignController } from './controllers/outbound-campaign.controller';
import { OutboundCampaignService } from './services/outbound-campaign.service';
import { LeadGroupModule } from 'src/modules/lead-group/lead-group.module';
import { DispositionModule } from 'src/modules/disposition/disposition.module';
import { OutboundCampaignDispositionSchema, outboundCampaigndispositionSchema } from './schema/outbound-campaign-disposition.schema';
import { OutboundCampaignDialableStatus, outboundCampaignDialableStatus } from './schema/outbound-campaign-dialable-status';
import { LeadManagementModule } from 'src/modules/lead-management/lead-management.module';
import { VoiceBroadcastSchema, voiceBroadcastSchema } from 'src/modules/voice-broadcast/schema/voice-broadcast.schema';
import { TenantSchema, tenantSchema } from 'src/modules/tenant/schema/tenant.schema';
import { AgentLiveReportSchema, agentLiveReportSchema } from 'src/modules/call-center/schema/agent-live-report.schema';
import { WebsocketsModule } from 'src/modules/websockets/websockets.module';
import { AgentCampaignLoginSchema, agentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
            { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema }
        ]),
        MongooseModule.forFeature([
            { name: OutboundCampaignDispositionSchema.name, schema: outboundCampaigndispositionSchema },
            { name: TenantSchema.name, schema: tenantSchema }
        ]),
        MongooseModule.forFeature([
            { name: OutboundCampaignDialableStatus.name, schema: outboundCampaignDialableStatus },
            { name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
            { name: AgentCampaignLoginSchema.name, schema: agentCampaignLoginSchema }
        ]),
        LeadGroupModule,
        DispositionModule,
        forwardRef(() => LeadManagementModule),
        WebsocketsModule
    ],
    controllers: [OutboundCampaignController],
    providers: [OutboundCampaignService],
    exports: [MongooseModule, OutboundCampaignService]
})
export class OutboundCampaignModule { }

