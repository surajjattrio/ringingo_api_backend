import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadResetProducerService } from './lead-reset-producer.service';
import { LeadResetJobSchema, leadResetJobSchema } from './lead-reset-job.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: LeadResetJobSchema.name, schema: leadResetJobSchema }]),
    ],
    providers: [LeadResetProducerService],
    exports: [LeadResetProducerService],
})
export class LeadResetProducerModule { }
