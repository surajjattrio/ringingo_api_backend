import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappsyncController } from './controllers/whatsappsync.controller';
import { whatsappsyncSchema, WhatsappsyncSchema } from './schema/whatsappmsync.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { whatsapp_available_agentSchema, Whatsapp_available_agentSchema } from '../agent/schema/whatsapp_available_agent.schema';
import { whatsappmessageSchema, WhatsappmessageSchema } from '../whatsapp-message/schema/whatsappmessage.schema';
import { messagingchannelSchema, MessagingChannelSchema } from '../messaging-channel/schema/messaging-channel.schema';
import { WebsocketsModule } from '../websockets/websockets.module';

import { WhatsappsyncService } from './services/whatsappsync.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: WhatsappsyncSchema.name, schema: whatsappsyncSchema }]),
    MongooseModule.forFeature([{ name: ExtensionSchema.name, schema: extensionSchema }]),
    MongooseModule.forFeature([{ name: Whatsapp_available_agentSchema.name, schema: whatsapp_available_agentSchema }]),
    MongooseModule.forFeature([{ name: WhatsappmessageSchema.name, schema: whatsappmessageSchema }]),
    MongooseModule.forFeature([{ name: MessagingChannelSchema.name, schema: messagingchannelSchema }]),
        WebsocketsModule
    ],

    controllers: [WhatsappsyncController],
    providers: [WhatsappsyncService],
    exports: [
        MongooseModule, // 👈 this ensures schemas are available when you import this module elsewhere
    ],
})
export class WhatsappsyncModule { }
