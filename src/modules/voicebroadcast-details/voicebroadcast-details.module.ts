import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoicebroadcastdetailsController } from './controllers/voicebroadcast-details.controller';
import { voicebroadcastdetailsSchema, VoicebroadcastdetailsSchema } from './schema/voicebroadcast-details.schema';
import { VoicebroadcastdetailsService } from './services/voicebroadcast-details.service';
import { ivrSchema, IvrSchema } from '../ivr/schema/ivr.schema';
import { ringgroupSchema, RinggroupSchema } from '../ringgroup/schema/ringgroup.schema';
import { callQueueSchema, CallQueueSchema } from '../call-queue/schema/call-queue.schema';
import { voiceBroadcastSchema, VoiceBroadcastSchema } from '../voice-broadcast/schema/voice-broadcast.schema';
import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';
import { CdrsSchema, cdrsSchema } from '../cdrs/schema/cdrs.schema';
import { DispositionSchema, dispositionSchema } from '../disposition/schema/disposition.schema';

@Module({
    imports:[MongooseModule.forFeature([ 
        { name : VoicebroadcastdetailsSchema.name  , schema : voicebroadcastdetailsSchema} ,
        { name : IvrSchema.name  , schema : ivrSchema} ,
        { name : RinggroupSchema.name  , schema : ringgroupSchema} ,
        { name : CallQueueSchema.name  , schema : callQueueSchema} ,
        { name : VoiceBroadcastSchema.name  , schema : voiceBroadcastSchema} ,
        { name : LeadManagementSchema.name , schema : leadManagementSchema },
        { name: CdrsSchema.name, schema: cdrsSchema },
        { name: DispositionSchema.name, schema: dispositionSchema },
    ])],
    controllers:[VoicebroadcastdetailsController],
    providers:[VoicebroadcastdetailsService],
    exports : [MongooseModule]
})

export class VoicebroadcastdetailsModule{}
