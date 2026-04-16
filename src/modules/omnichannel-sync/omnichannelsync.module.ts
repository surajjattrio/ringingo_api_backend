import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OmnichannelsyncController } from "./controllers/omnichannelsync.controller";
import {
  omnichannelsyncSchema,
  OmnichannelsyncSchema,
} from "./schema/omnichannelsync.schema";
import {
  omnichannelmessageSchema,
  OmnichannelmessageSchema,
} from "../omnichannel-message/schema/omnichannelmessage.schema";
import {
  messagingchannelSchema,
  MessagingChannelSchema,
} from "../messaging-channel/schema/messaging-channel.schema";
import { WebsocketsModule } from "../websockets/websockets.module";
import { OmnichannelsyncService } from "./services/omnichannelsync.service";
import { InstagramProviderService } from "./providers/instagram-provider.service";
import { WhatsappProviderService } from "./providers/whatsapp-provider.service";
import { blendedCampaignSchema, BlendedCampaignSchema } from "../campaigns/blended-campaign/schema/blended-campaign.schema";
import { messagingqueueSchema, MessagingQueueSchema } from "../messaging-queue/schema/messaging-queue.schema";
import { agentSchema, AgentSchema } from "../agent/schema/agent.schema";
import { FacebookProviderService } from "./providers/facebook-provider.service";
// Future: import { FacebookProviderService } from './providers/facebook-provider.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OmnichannelsyncSchema.name, schema: omnichannelsyncSchema },
    ]),
    MongooseModule.forFeature([
      { name: OmnichannelmessageSchema.name, schema: omnichannelmessageSchema },
    ]),
    MongooseModule.forFeature([
      { name: MessagingChannelSchema.name, schema: messagingchannelSchema },
    ]),
    MongooseModule.forFeature([
      { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
    ]),
       MongooseModule.forFeature([
      { name: MessagingQueueSchema.name, schema: messagingqueueSchema },
    ]),   MongooseModule.forFeature([
      { name: AgentSchema.name, schema: agentSchema },
    ]),

    WebsocketsModule,
  ],
      // @InjectModel(MessagingQueueSchema.name) private readonly messaging_queue: Model<MessagingQueueDocument>,
      // @InjectModel(AgentSchema.name) private readonly user: Model<AgentDocument>,
      // @InjectModel(OmnichannelmessageSchema.name) private readonly Omnichannelmessage: Model<OmnichannelmessageDocument>,
  
  controllers: [OmnichannelsyncController],
  providers: [
    OmnichannelsyncService,
    InstagramProviderService,
    WhatsappProviderService,
    FacebookProviderService
  ],
  exports: [MongooseModule, OmnichannelsyncService],
})
export class OmnichannelsyncModule {}