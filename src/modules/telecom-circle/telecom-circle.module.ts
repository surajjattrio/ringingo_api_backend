import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelecomcircleController } from './controllers/telecom-circle.controller';
import { TelecomCircleService } from './services/telecom-circle.service';
import { TelecomCircleSchema, telecomCircleSchema } from './schema/telecom-circle.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';

@Module( {
     imports: [ MongooseModule.forFeature(
          [
               { name: TelecomCircleSchema.name, schema: telecomCircleSchema },
               { name: TenantSchema.name, schema: tenantSchema },
          ]
     ) ],
     providers: [ TelecomCircleService ],
     controllers: [ TelecomcircleController ]
} )
export class TelecomCircleModule { }


