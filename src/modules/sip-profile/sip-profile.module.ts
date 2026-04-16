import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { trunkSchema, TrunkSchema } from '../trunk/schema/trunk.schema';
import { SipProfileController } from './controllers/sip-profile.controller';
import { sipProfileSchema, SipProfileSchema } from './schema/sip-profile-schema';
import { SipProfileService } from './services/sip-profile-service';

@Module({
    imports :[MongooseModule.forFeature([ { name : SipProfileSchema.name , schema : sipProfileSchema} ]),
    MongooseModule.forFeature([ { name : TenantSchema.name , schema : tenantSchema} ]),MongooseModule.forFeature([ { name : TrunkSchema.name , schema : trunkSchema} ])],
    controllers : [SipProfileController],
    providers : [SipProfileService],
    exports:[MongooseModule]
})
export class SipProfileModule {}

