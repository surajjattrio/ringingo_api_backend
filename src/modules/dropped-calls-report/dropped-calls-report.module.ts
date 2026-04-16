import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DroppedCallsReportController } from './controllers/dropped-calls-report.controller';
import { DroppedCallsReportService } from './services/dropped-calls-report.service';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { dropCallsSchema, DropCallsSchema } from './schema/drop-calls.schema';

@Module( {
    imports: [ MongooseModule.forFeature(
        [
            { name: CdrsSchema.name, schema: cdrsSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: DropCallsSchema.name, schema: dropCallsSchema },
        ]
    ) ],
    providers: [ DroppedCallsReportService ],
    controllers: [ DroppedCallsReportController ]
} )
export class DroppedCallsReportModule { }