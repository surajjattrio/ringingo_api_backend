import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingQueueController } from './controllers/messaging-queue.controller';
import { messagingqueueSchema, MessagingQueueSchema } from './schema/messaging-queue.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { conferenceSchema, ConferenceSchema } from '../conference/schema/conference.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';


import { MessagingQueueService } from './services/messaging-queue.service';

@Module( {
    imports: [ MongooseModule.forFeature( [ { name: MessagingQueueSchema.name, schema: messagingqueueSchema },{ name: ManagerSchema.name, schema: managerSchema } ] ),
    MongooseModule.forFeature( [ { name: ExtensionSchema.name, schema: extensionSchema } ] ),
    MongooseModule.forFeature( [ { name: ConferenceSchema.name, schema: conferenceSchema } ] )
    ],
    controllers: [ MessagingQueueController ],
    providers: [ MessagingQueueService ],

} )
export class MessagingQueueModule { }
