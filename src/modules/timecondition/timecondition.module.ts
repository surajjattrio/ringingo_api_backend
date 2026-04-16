import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimeconditionController } from './controllers/timecondition.controller';
import { timeconditionSchema, TimeconditionSchema } from './schema/timecondition.schema';
import { TimeconditionService } from './services/timecondition.service';

@Module({
    imports:[MongooseModule.forFeature([ { name : TimeconditionSchema.name ,schema : timeconditionSchema } ])],
    controllers:[TimeconditionController],
    providers : [TimeconditionService]
})
export class TimeconditionModule {}
