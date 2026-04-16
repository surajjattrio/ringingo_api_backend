import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignReportController } from './controllers/campaign-report.controller';
import { CampaignReportService } from './services/campaign-report.service';
import { campaignReportSchema, CampaignReportSchema } from './schema/campaign-report.schema';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { agentCampaignReportSchema, AgentCampaignReportSchema } from '../call-center/schema/agent-campaign-report.schema';

import { blendedCampaignSchema, BlendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';
import { inboundCampaignSchema, InboundCampaignSchema } from 'src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema';
import { outboundCampaignSchema, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CampaignReportSchema.name, schema: campaignReportSchema },
            { name: CdrsSchema.name, schema: cdrsSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: AgentCampaignReportSchema.name, schema: agentCampaignReportSchema },
            { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
            { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
            { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
        ]),
    ],
    controllers: [CampaignReportController],
    providers: [CampaignReportService],

})
export class CampaignreportModule { }

