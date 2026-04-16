import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoiceAlertController } from './controllers/voice-alert.controller';
import { Voice, VoiceAlertSchema } from './schema/voice-alert.schema';
import { VoiceAlertService } from './services/voice-alert.service';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { userGroupSchema, UserGroupSchema } from '../user-group/schema/user-group.schema';
import { GreetingModule } from '../greeting/greeting.module';
import { didSchema, DidSchema } from '../did/schema/did.schema';
import { OutgoingRulesSchema, outgoingRulesSchema } from '../outgoing-rules/schema/outgoing-rules.schema';
import { trunkSchema, TrunkSchema } from '../trunk/schema/trunk.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TenantSchema.name, schema: tenantSchema },
            { name: Voice.name, schema: VoiceAlertSchema },
            { name: DidSchema.name, schema: didSchema },
            { name: UserGroupSchema.name, schema: userGroupSchema },
            { name: OutgoingRulesSchema.name, schema: outgoingRulesSchema },
            { name: TrunkSchema.name, schema: trunkSchema },
        ]),
        GreetingModule
    ],
    controllers: [VoiceAlertController],
    providers: [VoiceAlertService],
    exports: [VoiceAlertService, MongooseModule]
})
export class VoiceAlertModule { }
