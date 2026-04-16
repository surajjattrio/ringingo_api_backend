import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConferenceController } from './controllers/conference.controller';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { conferenceSchema, ConferenceSchema } from './schema/conference.schema';
import { ConferenceService } from './services/conference.service';

@Module({
    imports : [MongooseModule.forFeature([ { name : ConferenceSchema.name , schema : conferenceSchema },{ name: ManagerSchema.name, schema: managerSchema }, ])],
    controllers:[ConferenceController],
    providers:[ConferenceService]
})
export class ConferenceModule {}
