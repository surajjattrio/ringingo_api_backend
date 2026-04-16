import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { LeadreportController } from './controllers/lead-report.controller';
import { LeadreportService } from './services/lead-report.service';
import { leadreportSchema, LeadreportSchema } from './schema/lead-report.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { leadManagementSchema, LeadManagementSchema } from '../lead-management/schema/lead-management.schema';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TenantSchema.name, schema: tenantSchema },
            { name: ExtensionSchema.name, schema: extensionSchema },
            { name: UserSchema.name, schema: userSchema },
            { name: LeadreportSchema.name, schema: leadreportSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: LeadManagementSchema.name, schema: leadManagementSchema },
        ]),

    ],
    controllers: [LeadreportController],
    providers: [LeadreportService],

})
export class LeadreportModule { }

