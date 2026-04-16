import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModechangeController } from './controllers/modechange.controller';
import { modechangeSchema, ModechangeSchema } from './schema/modechange.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { conferenceSchema, ConferenceSchema } from '../conference/schema/conference.schema';


import { ModechangeService } from './services/modechange.service';

@Module( {
    imports: [ MongooseModule.forFeature( [ { name: ModechangeSchema.name, schema: modechangeSchema } ] ),
    MongooseModule.forFeature( [ { name: ExtensionSchema.name, schema: extensionSchema } ] ),
    MongooseModule.forFeature( [ { name: ConferenceSchema.name, schema: conferenceSchema } ] )
    ],
    controllers: [ ModechangeController ],
    providers: [ ModechangeService ],

} )
export class ModechangeModule { }
