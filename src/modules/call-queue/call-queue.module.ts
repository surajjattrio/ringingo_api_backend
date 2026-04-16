import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallQueueController } from './controllers/call-queue.controller';
import { callQueueAgentSchema, CallQueueAgentSchema } from './schema/call-queue-agent.schema';
import { callQueueSchema, CallQueueSchema } from './schema/call-queue.schema';
import { CallQueueService } from './services/call-queue.service';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';

@Module({
    imports:[MongooseModule.forFeature([ { name : CallQueueSchema.name , schema : callQueueSchema } , { name : CallQueueAgentSchema.name , schema : callQueueAgentSchema }, { name: ManagerSchema.name, schema: managerSchema }, ])],
    controllers:[CallQueueController],
    providers:[CallQueueService]
})
export class CallQueueModule {}
