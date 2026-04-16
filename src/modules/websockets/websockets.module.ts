//  websockets.module.ts
import { Module } from "@nestjs/common";
import { SocketService } from "./websockets.gateway";
import {
     AgentLiveReportSchema,
     agentLiveReportSchema,
} from "../call-center/schema/agent-live-report.schema";
import { MongooseModule } from "@nestjs/mongoose";
import {
     whatsappsyncSchema,
     WhatsappsyncSchema,
} from "../whatsapp-sync/schema/whatsappmsync.schema";
import {
     WhatsappmessageSchema,
     whatsappmessageSchema,
} from "../whatsapp-message/schema/whatsappmessage.schema";
import {
     messagingchannelSchema,
     MessagingChannelSchema,
} from "../messaging-channel/schema/messaging-channel.schema";
import {
     whatsapp_available_agentSchema,
     Whatsapp_available_agentSchema,
} from "../agent/schema/whatsapp_available_agent.schema";
import { omnichannelmessageSchema, OmnichannelmessageSchema } from "../omnichannel-message/schema/omnichannelmessage.schema";
import { OmnichannelsyncSchema, omnichannelsyncSchema } from "../omnichannel-sync/schema/omnichannelsync.schema";
@Module({
     imports: [
          MongooseModule.forFeature([
               { name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
               { name: WhatsappsyncSchema.name, schema: whatsappsyncSchema },
               { name: WhatsappmessageSchema.name, schema: whatsappmessageSchema },
               { name: OmnichannelmessageSchema.name, schema: omnichannelmessageSchema },
               { name: OmnichannelsyncSchema.name, schema: omnichannelsyncSchema },
               { name: MessagingChannelSchema.name, schema: messagingchannelSchema },
               {
                    name: Whatsapp_available_agentSchema.name,
                    schema: whatsapp_available_agentSchema,
               },
          ]),
     ],
     providers: [SocketService],
     exports: [SocketService],
})
export class WebsocketsModule { }
