import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { TenantreportController } from './controllers/tenant-report.controller';
import { TenantreportService } from './services/tenant-report.service';
import { tenantreportSchema, TenantreportSchema } from './schema/tenant-report.schema';
import { tenantreportsearchSummary, TenantSummary } from './schema/tenantreportsearch.schema';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';

@Module({
    imports : [
    MongooseModule.forFeature([{ name: TenantSchema.name, schema: tenantSchema }]) ,
    MongooseModule.forFeature([{ name: ExtensionSchema.name, schema: extensionSchema }]) ,
    MongooseModule.forFeature([{ name: UserSchema.name, schema: userSchema }]) ,
    MongooseModule.forFeature([ { name : TenantreportSchema.name , schema : tenantreportSchema } ]),
    MongooseModule.forFeature([ { name :TenantSummary.name  , schema : tenantreportsearchSummary}]) ,
    MongooseModule.forFeature([{ name : CdrsSchema.name  , schema : cdrsSchema}]),
    ],
    controllers:[TenantreportController],
    providers:[TenantreportService],

})
export class TenantreportModule {}
