import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappmessageController } from './controllers/whatsappmessage.controller';
import { whatsappmessageSchema, WhatsappmessageSchema } from './schema/whatsappmessage.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { messagingchannelSchema, MessagingChannelSchema } from '../messaging-channel/schema/messaging-channel.schema';
import { messagingqueueSchema, MessagingQueueSchema } from '../messaging-queue/schema/messaging-queue.schema';
import { blendedCampaignSchema, BlendedCampaignSchema } from '../campaigns/blended-campaign/schema/blended-campaign.schema';
import { unreadwhatsappmessageSchema, UnreadwhatsappmessageSchema } from './schema/unread_whatsappmessage.schema';
import { agentSchema, AgentSchema } from '../agent/schema/agent.schema';
import { WhatsappmessageService } from './services/whatsappmessage.service';
import { leadManagementSchema, LeadManagementSchema } from '../lead-management/schema/lead-management.schema';

@Module( {
    imports: [ MongooseModule.forFeature( [ { name: WhatsappmessageSchema.name, schema: whatsappmessageSchema } ] ),
    MongooseModule.forFeature( [ { name: ExtensionSchema.name, schema: extensionSchema } ] ),
    MongooseModule.forFeature( [ { name: LeadManagementSchema.name, schema: leadManagementSchema } ] ),
    MongooseModule.forFeature( [ { name: MessagingChannelSchema.name, schema: messagingchannelSchema } ] ),
    MongooseModule.forFeature( [ { name: MessagingQueueSchema.name, schema: messagingqueueSchema } ] ),
    MongooseModule.forFeature( [ { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema } ] ),
    MongooseModule.forFeature( [ { name: UnreadwhatsappmessageSchema.name, schema: unreadwhatsappmessageSchema } ] ),
    MongooseModule.forFeature( [ { name: AgentSchema.name, schema: agentSchema }, ] )
    ],
    controllers: [ WhatsappmessageController ],
    providers: [ WhatsappmessageService ],

} )
export class WhatsappmessageModule { }
