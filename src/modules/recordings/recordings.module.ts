import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { RecordingsController } from './controllers/recordings.controller';
import { recordingsSchema, RecordingsSchema } from './schema/recordings.schema';
import { RecordingsService } from './services/recordings.service';

import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";

@Module( {
    imports: [ MongooseModule.forFeature(
        [
            { name: RecordingsSchema.name, schema: recordingsSchema },
            { name: TenantSchema.name, schema: tenantSchema }
        ]
    ), HttpModule ],
    providers: [ RecordingsService ],
    controllers: [ RecordingsController ]
} )
export class RecordingsModule { }
