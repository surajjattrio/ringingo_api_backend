import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallerIdGroupSchema, callerIdGroupSchema } from './schema/caller-id-group.schema';
import { CallerIdGroupController } from './controllers/caller-id-group.controller';
import { CallerIdGroupService } from './services/caller-id-group.service';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { CallerIdSchema, callerIdSchema } from './schema/caller-ids.schema';

@Module({
    imports:[MongooseModule.forFeature([{ name : CallerIdGroupSchema.name , schema : callerIdGroupSchema },{ name: ManagerSchema.name, schema: managerSchema },]),
    MongooseModule.forFeature([{ name : CallerIdSchema.name , schema : callerIdSchema }]) ],
    controllers:[CallerIdGroupController],
    providers:[CallerIdGroupService]
})
export class CallerIdGroupModule {}

