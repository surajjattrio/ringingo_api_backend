import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IvrController } from './controllers/ivr.controller';
import { ivrSchema, IvrSchema } from './schema/ivr.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { conferenceSchema, ConferenceSchema } from '../conference/schema/conference.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';


import { IvrService } from './services/ivr.service';

@Module({
    imports : [MongooseModule.forFeature([ { name : IvrSchema.name , schema : ivrSchema } ]),
    MongooseModule.forFeature([ { name : ExtensionSchema.name , schema : extensionSchema } ]),
    MongooseModule.forFeature([ { name : ConferenceSchema.name , schema : conferenceSchema }, { name: ManagerSchema.name, schema: managerSchema } ])
    ],
    controllers:[IvrController],
    providers:[IvrService],

})
export class IvrModule {}
