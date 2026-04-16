import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRoleController } from './controllers/user-role.controller';
import { userRoleSchema, UserRoleSchema } from './schema/user-role.schema';
import { UserRoleService } from './services/user-role.service';
import { StickyAgentSchema, stickyAgentSchema } from '../sticky-agent/schema/sticky-agent.schema';

@Module({
    imports:[MongooseModule.forFeature([ { name : UserRoleSchema.name , schema : userRoleSchema},{ name: StickyAgentSchema.name, schema: stickyAgentSchema } ])],
    controllers:[UserRoleController],
    providers:[UserRoleService],
    exports : [MongooseModule]
})
export class UserRoleModule {}
