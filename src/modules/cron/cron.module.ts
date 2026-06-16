import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CronService } from './services/cron.service';
import { PredictiveCalculationSchema, predictiveCalculationSchema } from '../campaigns/inbound-campaign/schema/predictive-calculation.schema';
import { CdrsSchema, cdrsSchema } from '../cdrs/schema/cdrs.schema';
import { CdrsArchiveSchema, cdrsArchiveSchema } from "../cdrs/schema/cdrs-archive.schema";
import { CdrsArchiveService } from '../cdrs/services/cdrs-archive.service';
import { CDRSArchieveSearchService } from "src/modules/cdrs/services/cdrs-archive-search.service";

import { RecordingsSchema, recordingsSchema } from "../recordings/schema/recordings.schema";
import { RecordingsService } from '../recordings/services/recordings.service';
import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";

import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';
import { RequestSchedulerSchema, requestSchedulerSchema } from '../request-scheduler/schema/request-scheduler.schema';
import { RequestSchedulerService } from '../request-scheduler/services/request-scheduler.service';
import { RequestSchedulerModule } from '../request-scheduler/request-scheduler.module';
import { DispositionModule } from '../disposition/disposition.module';
import { mailScheduleSchema, MailScheduleSchema } from '../mail-schedule/schema/mail-schedule.schema';
import { mailConfigurationSchema, MailConfigurationSchema } from '../mail-configuration/schema/mail-configuration.schema';
import { emailTemplateSchema, EmailTemplateSchema } from '../email-template/schema/email-template.schema';
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { UserPerformanseReportModule } from '../user-performance-report/user-performance-report.module';
import { CdrsModule } from '../cdrs/cdrs.module';
import { LoginlogoutreportModule } from '../login-logout-report/login-logout-report.module';
import { CallQueueReportModule } from '../call-queue-report/call-queue-report.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PredictiveCalculationSchema.name, schema: predictiveCalculationSchema },
            { name: CdrsSchema.name, schema: cdrsSchema },
            { name: CdrsArchiveSchema.name, schema: cdrsArchiveSchema },
            { name: RecordingsSchema.name, schema: recordingsSchema },
            { name: TenantSchema.name, schema: tenantSchema },

            { name: LeadManagementSchema.name, schema: leadManagementSchema },
            { name: RequestSchedulerSchema.name, schema: requestSchedulerSchema },
            { name: MailScheduleSchema.name, schema: mailScheduleSchema },
            { name: MailConfigurationSchema.name, schema: mailConfigurationSchema },
            { name: EmailTemplateSchema.name, schema: emailTemplateSchema },
            { name: UserSchema.name, schema: userSchema },
        ]),
        RequestSchedulerModule,
        DispositionModule,
        UserPerformanseReportModule,
        CdrsModule,
        LoginlogoutreportModule,
        CallQueueReportModule,
        CommonModule
    ],
    providers: [CronService, CdrsArchiveService, CDRSArchieveSearchService, RecordingsService, RequestSchedulerService]
})
export class CronModule { }

