import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BreakcodeController } from './controllers/breakcode.controller';
import { breakcodeSchema, BreakcodeSchema } from './schema/breakcode.schema';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { conferenceSchema, ConferenceSchema } from '../conference/schema/conference.schema';
import { AgentLoginLogoutSchema, agentLoginLogoutSchema } from '../call-center/schema/agent-login-logout.schema';


import { BreakcodeService } from './services/breakcode.service';

@Module({
    imports : [MongooseModule.forFeature([ 
        { name : BreakcodeSchema.name , schema : breakcodeSchema } ,
        { name : ExtensionSchema.name , schema : extensionSchema },
        { name : ConferenceSchema.name , schema : conferenceSchema } ,
        { name: AgentLoginLogoutSchema.name, schema: agentLoginLogoutSchema },
        ]),
    ],
    controllers:[BreakcodeController],
    providers:[BreakcodeService],

})
export class BreakcodeModule {}
