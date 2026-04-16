import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InboundCampaignSchema, inboundCampaignSchema } from './schema/inbound-campaign.schema';
import { InboundCampaignController } from './controllers/inbound-campaign.controller';
import { InboundCampaignService } from './services/inbound-campaign.service';
import { InboundCampaignDispositionSchema, inboundCampaigndispositionSchema } from './schema/inbound-campaign-disposition.schema';
import { LeadManagementSchema, leadManagementSchema } from 'src/modules/lead-management/schema/lead-management.schema';
import { CdrsSchema, cdrsSchema } from 'src/modules/cdrs/schema/cdrs.schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from '../blended-campaign/schema/blended-campaign.schema';
import { LeadReportSchema, leadReportSchema } from 'src/modules/call-center/schema/lead-report.schema';
import { DncSchema, dncSchema } from 'src/modules/dnc/schema/dnc.schema';
import { OutboundCampaignSchema, outboundCampaignSchema } from "../outbound-campaign/schema/outbound-campaign.schema";
import { AgentCampaignLoginSchema, agentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';
import { ExtensionSchema, extensionSchema } from 'src/modules/extension/schema/extension.schema';
import { TenantSchema, tenantSchema } from 'src/modules/tenant/schema/tenant.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: InboundCampaignSchema.name, schema: inboundCampaignSchema }, { name: InboundCampaignDispositionSchema.name, schema: inboundCampaigndispositionSchema }, { name: LeadManagementSchema.name, schema: leadManagementSchema }, { name: CdrsSchema.name, schema: cdrsSchema }, { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema }, { name: LeadReportSchema.name, schema: leadReportSchema }, { name: DncSchema.name, schema: dncSchema }, { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema }, { name: AgentCampaignLoginSchema.name, schema: agentCampaignLoginSchema }, { name: ExtensionSchema.name, schema: extensionSchema }, { name: TenantSchema.name, schema: tenantSchema }])],
    controllers: [InboundCampaignController],
    providers: [InboundCampaignService],
    exports: [MongooseModule]
})
export class InboundCampaignModule {}

