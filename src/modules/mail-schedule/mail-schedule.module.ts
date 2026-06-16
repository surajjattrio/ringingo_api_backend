import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailScheduleController } from './mail-schedule.controller';
import { MailScheduleService } from './mail-schedule.service';
import { mailScheduleSchema, MailScheduleSchema } from './schema/mail-schedule.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: MailScheduleSchema.name, schema: mailScheduleSchema }])],
    controllers: [MailScheduleController],
    providers: [MailScheduleService],
    exports: [MongooseModule]
})
export class MailScheduleModule {}
