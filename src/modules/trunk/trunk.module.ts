import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { sipProfileSchema, SipProfileSchema } from '../sip-profile/schema/sip-profile-schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { TrunkController } from './controllers/trunk.controller';
import { trunkSchema, TrunkSchema } from './schema/trunk.schema';
import { TrunkService } from './services/trunk.service';

@Module({
    imports:[MongooseModule.forFeature([ { name : TrunkSchema.name , schema : trunkSchema } ]) , MongooseModule.forFeature([ { name : TenantSchema.name , schema : tenantSchema} ]) , MongooseModule.forFeature([ { name : SipProfileSchema.name , schema : sipProfileSchema} ])],
    controllers : [TrunkController],
    providers : [TrunkService]
})
export class TrunkModule {}

