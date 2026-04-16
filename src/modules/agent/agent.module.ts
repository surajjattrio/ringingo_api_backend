import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentController } from './controllers/agent.controller';
import { agentSchema, AgentSchema } from './schema/agent.schema';
import { AgentService } from './services/agent.service';
import { TenantModule } from '../tenant/tenant.module';
import { SipProfileModule } from '../sip-profile/sip-profile.module';
import { MasterAdminModule } from "../master-admin/master-admin.module";
import { timezoneSchema, TimezoneSchema } from "../timezone/schema/timezone.schema";
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { whatsapp_available_agentSchema, Whatsapp_available_agentSchema } from '../agent/schema/whatsapp_available_agent.schema';
import { messagingchannelSchema, MessagingChannelSchema } from "../messaging-channel/schema/messaging-channel.schema";
import { messagingqueueSchema, MessagingQueueSchema } from "../messaging-queue/schema/messaging-queue.schema";
import { modechangeSchema, ModechangeSchema } from "../modechange/schema/modechange.schema";
import { whatsappsyncSchema, WhatsappsyncSchema } from '../whatsapp-sync/schema/whatsappmsync.schema';
import { InboundCampaignSchema, inboundCampaignSchema } from '../campaigns/inbound-campaign/schema/inbound-campaign.schema';
import { OutboundCampaignSchema, outboundCampaignSchema } from '../campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from '../campaigns/blended-campaign/schema/blended-campaign.schema';

@Module( {
    imports: [ MongooseModule.forFeature( [
        { name: AgentSchema.name, schema: agentSchema },
        { name: TimezoneSchema.name, schema: timezoneSchema },
        { name: ManagerSchema.name, schema: managerSchema },
        { name: Whatsapp_available_agentSchema.name, schema: whatsapp_available_agentSchema },
        { name: MessagingChannelSchema.name, schema: messagingchannelSchema },
        { name: MessagingQueueSchema.name, schema: messagingqueueSchema },
        { name: ModechangeSchema.name, schema: modechangeSchema },
        { name: WhatsappsyncSchema.name, schema: whatsappsyncSchema },
        { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
        { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
        { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
    ] ), TenantModule, SipProfileModule, MasterAdminModule ],
    controllers: [ AgentController ],
    providers: [ AgentService ]
} )
export class AgentModule { }

