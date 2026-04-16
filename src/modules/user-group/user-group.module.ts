import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGroupController } from './controllers/user-group.controller';
import { userGroupSchema, UserGroupSchema } from './schema/user-group.schema';
import { UserGroupService } from './services/user-group.service';

@Module({
    imports:[MongooseModule.forFeature([ { name : UserGroupSchema.name , schema :  userGroupSchema} ])],
    controllers:[UserGroupController],
    providers:[UserGroupService],
    exports : [MongooseModule]
})
export class UserGroupModule {}
