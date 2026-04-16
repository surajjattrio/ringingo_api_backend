import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManagerRoleSchema, managerRoleSchema } from './schema/manager-role.schema';
import { ManagerRoleService } from './services/manager-role.service';
import { ManagerRoleController } from './controllers/manager-role.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: ManagerRoleSchema.name, schema: managerRoleSchema }])],
    controllers: [ManagerRoleController],
    providers: [ManagerRoleService]
})
export class ManagerRoleModule {}
