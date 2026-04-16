import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OmnichannelmessageController } from './controllers/omnichannelmessage.controller';
import { OmnichannelmessageService } from './services/omnichannelmessage.service';
import { omnichannelmessageSchema, OmnichannelmessageSchema } from './schema/omnichannelmessage.schema';
import { omnichannelsyncSchema, OmnichannelsyncSchema } from '../omnichannel-sync/schema/omnichannelsync.schema';
import { messagingchannelSchema, MessagingChannelSchema } from '../messaging-channel/schema/messaging-channel.schema';
import { WebsocketsModule } from '../websockets/websockets.module';
import { InstagramProviderService } from '../omnichannel-sync/providers/instagram-provider.service';
import { WhatsappProviderService } from '../omnichannel-sync/providers/whatsapp-provider.service';
import { leadManagementSchema, LeadManagementSchema } from '../lead-management/schema/lead-management.schema';
import { FacebookProviderService } from '../omnichannel-sync/providers/facebook-provider.service';
import { omniChannelReportSchema, OmniChannelReportSchema } from '../omni-channel-report/schema/omni-channel-report.schema';
// Future: import { FacebookProviderService } from '../omnichannel-sync/providers/facebook-provider.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: OmnichannelmessageSchema.name, schema: omnichannelmessageSchema }
        ]),
        MongooseModule.forFeature([
            { name: OmniChannelReportSchema.name, schema: omniChannelReportSchema }
        ]),
        MongooseModule.forFeature([
            { name: OmnichannelsyncSchema.name, schema: omnichannelsyncSchema }
        ]),
        MongooseModule.forFeature([
            { name: MessagingChannelSchema.name, schema: messagingchannelSchema }
        ]),
        MongooseModule.forFeature([
            { name: LeadManagementSchema.name, schema: leadManagementSchema }
        ]),
        WebsocketsModule
    ],
    controllers: [OmnichannelmessageController],
    providers: [
        OmnichannelmessageService,
        InstagramProviderService,
        WhatsappProviderService,
        FacebookProviderService,
    ],
    exports: [
        MongooseModule,
        OmnichannelmessageService,
    ],
})
export class OmnichannelmessageModule { }