import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MissedcallreportController } from './controllers/missed-call-report.controller';
import { MissedcallreportService } from '../missed-call-report/services/missed-call-report.service';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { missedCallsSchema, MissedCallsSchema } from './schema/missed-calls.schema';

@Module({
    imports: [MongooseModule.forFeature(
        [
            { name: CdrsSchema.name, schema: cdrsSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: MissedCallsSchema.name, schema: missedCallsSchema },
        ]
    )],
    providers: [MissedcallreportService],
    controllers: [MissedcallreportController]
})
export class MissedcallreportModule { }


