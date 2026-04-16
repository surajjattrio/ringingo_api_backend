import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClickToCallSchema, clicktoCallSchema } from './schema/click-to-call.schema';
import { ClickToCallController } from './controllers/click-to-call.controller';
import { ClickToCallService } from './services/click-to-call.service';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { GreetingModule } from '../greeting/greeting.module';

@Module({
    imports: [MongooseModule.forFeature([
        { name: ClickToCallSchema.name, schema: clicktoCallSchema },
        { name: ManagerSchema.name, schema: managerSchema },
    ]),
        GreetingModule, // ✅ import module
    ],
    controllers: [ClickToCallController],
    providers: [ClickToCallService],
})
export class ClickToCallModule { }
