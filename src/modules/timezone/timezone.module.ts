import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimezoneController } from './controllers/timezone.controller';
import { timezoneSchema, TimezoneSchema } from './schema/timezone.schema';
import { TimezoneService } from './services/timezone.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: TimezoneSchema.name, schema: timezoneSchema }])],
    controllers: [TimezoneController],
    providers: [TimezoneService]
})
export class TimezoneModule {

}

