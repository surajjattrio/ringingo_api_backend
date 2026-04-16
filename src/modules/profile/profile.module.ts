import { Module } from '@nestjs/common';
import { MasterAdminModule } from '../master-admin/master-admin.module';
import { TenantModule } from '../tenant/tenant.module';
import { UserModule } from '../user/user.module';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { MongooseModule } from '@nestjs/mongoose';
import { WebHookSchema, webHookSchema } from './schema/web-hook.schema';

@Module({
    imports:[TenantModule,UserModule,MasterAdminModule,MongooseModule.forFeature([
        { name : WebHookSchema.name , schema : webHookSchema}
    ])],
    controllers:[ProfileController],
    providers:[ProfileService]
})
export class ProfileModule {}
