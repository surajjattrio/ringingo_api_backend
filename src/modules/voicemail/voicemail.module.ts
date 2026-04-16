import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { VoicemailController } from './controllers/voicemail.controller';
import { VoicemailService } from './services/voicemail.service';

@Module({
    imports : [
    MongooseModule.forFeature([{ name: TenantSchema.name, schema: tenantSchema }]) ,
    MongooseModule.forFeature([{ name: ExtensionSchema.name, schema: extensionSchema }]) ,
    MongooseModule.forFeature([{ name: UserSchema.name, schema: userSchema }]) ,
    ],
    controllers:[VoicemailController],
    providers:[VoicemailService],

})
export class VoicemailModule {}
