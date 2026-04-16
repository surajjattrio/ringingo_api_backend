import { Module } from '@nestjs/common'; 
import { MongooseModule } from '@nestjs/mongoose';
import { sipProfileSchema, SipProfileSchema } from '../sip-profile/schema/sip-profile-schema';
import { SipProfileService } from '../sip-profile/services/sip-profile-service';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { TenantService } from '../tenant/services/tenant.service';
import { ExtensionController } from './controllers/extension.controller';
import { extensionSchema, ExtensionSchema } from './schema/extension.schema';
import { ExtensionService } from './services/extension.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: "extension", schema: extensionSchema }]),
    MongooseModule.forFeature([{ name: TenantSchema.name, schema: tenantSchema }]) ,MongooseModule.forFeature([{ name: SipProfileSchema.name, schema: sipProfileSchema }]) ],
    controllers: [ExtensionController],
    providers: [ExtensionService],
    exports : [MongooseModule,ExtensionService]
})

export class ExtensionModule {

}

