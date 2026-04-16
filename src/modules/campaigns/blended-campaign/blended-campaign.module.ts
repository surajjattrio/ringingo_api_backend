import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadGroupModule } from 'src/modules/lead-group/lead-group.module';
import { DispositionModule } from 'src/modules/disposition/disposition.module';
import { LeadManagementModule } from 'src/modules/lead-management/lead-management.module';
import { VoiceBroadcastSchema, voiceBroadcastSchema } from 'src/modules/voice-broadcast/schema/voice-broadcast.schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from './schema/blended-campaign.schema';
import { BlendedCampaignController } from './controllers/blended-campaign.controller';
import { BlendedCampaignService } from './services/blended-campaign.service';
import { BlendedCampaignDialableStatus, blendedCampaignDialableStatus } from './schema/blended-campaign-dialable-status';
import { BlendedCampaignDispositionSchema, blendedCampaigndispositionSchema } from './schema/blended-campaign-disposition';
import { AgentCampaignLoginSchema, agentCampaignLoginSchema } from 'src/modules/call-center/schema/agent-campaign-login.schema';
import { ExtensionSchema, extensionSchema } from 'src/modules/extension/schema/extension.schema';
import { TenantSchema, tenantSchema } from 'src/modules/tenant/schema/tenant.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: BlendedCampaignSchema.name, schema: blendedCampaignSchema }, { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema }]), MongooseModule.forFeature([{ name: BlendedCampaignDispositionSchema.name, schema: blendedCampaigndispositionSchema }]),
    MongooseModule.forFeature( [ { name: BlendedCampaignDialableStatus.name, schema: blendedCampaignDialableStatus } ] ),  
     MongooseModule.forFeature([{ name: AgentCampaignLoginSchema.name, schema: agentCampaignLoginSchema }, { name: ExtensionSchema.name, schema: extensionSchema }, { name: TenantSchema.name, schema: tenantSchema }]), 
     LeadGroupModule, DispositionModule, forwardRef(() => LeadManagementModule)],
    controllers: [ BlendedCampaignController ],
    providers: [ BlendedCampaignService ],
    exports: [ MongooseModule, BlendedCampaignService ]
} )
export class BlendedCampaignModule { }


