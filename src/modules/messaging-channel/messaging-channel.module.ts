import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingChannelController } from './controllers/messaging-channel.controller';
import { messagingchannelSchema, MessagingChannelSchema } from './schema/messaging-channel.schema';
import { MessagingChannelService } from './services/messaging-channel.service';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';

@Module( {
    imports: [ MongooseModule.forFeature( [ { name: MessagingChannelSchema.name, schema: messagingchannelSchema },{ name: ManagerSchema.name, schema: managerSchema } ] ),
    ],
    controllers: [ MessagingChannelController ],
    providers: [ MessagingChannelService ],

} )
export class MessagingChannelModule { }
