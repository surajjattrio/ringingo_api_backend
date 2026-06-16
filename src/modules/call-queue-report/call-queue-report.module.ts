import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallQueueReportController } from './controllers/call-queue-report.controller';
import { CallQueueReportService } from './services/call-queue-report.service';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';

@Module( {
    imports: [ MongooseModule.forFeature(
        [
            { name: CdrsSchema.name, schema: cdrsSchema },
        ]
    ) ],
    providers: [ CallQueueReportService ],
    controllers: [ CallQueueReportController ],
    exports: [ CallQueueReportService ]
} )
export class CallQueueReportModule { }