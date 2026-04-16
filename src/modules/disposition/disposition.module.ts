import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DispositionSchema, dispositionSchema } from './schema/disposition.schema';
import { DispositionController } from './controllers/disposition.controller';
import { DispositionService } from './services/disposition.service';
import { LeadGroupSchema, leadGroupSchema } from '../lead-group/schema/lead-group.schema';
import { LeadReportSchema, leadReportSchema } from '../call-center/schema/lead-report.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
@Module({
    imports : [MongooseModule.forFeature([ { name : DispositionSchema.name , schema : dispositionSchema } , { name: LeadGroupSchema.name, schema: leadGroupSchema }, {name : LeadReportSchema.name , schema : leadReportSchema}, { name: TenantSchema.name, schema: tenantSchema }, ])],
    controllers : [DispositionController],
    providers:[DispositionService],
    exports : [MongooseModule]
})
export class DispositionModule {}
