import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './controllers/user.controller';
import { userSchema, UserSchema } from './schema/user.schema';
import { UserService } from './services/user.service';
import { extensionSchema, ExtensionSchema } from '../extension/schema/extension.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { licenseSchema, LicenseSchema } from "../master-admin/schema/license.schema";
import { ExtensionModule } from '../extension/extension.module';
import { sipProfileSchema, SipProfileSchema } from '../sip-profile/schema/sip-profile-schema';
import { rolesSchema, RolesSchema } from '../roles/schema/roles-schema';
import { UserRabbitmqService } from './services/user-rabbitmq.service';
import { TenantModule } from '../tenant/tenant.module';


@Module( {
    imports: [
         MongooseModule.forFeature([{ name: "extension", schema: extensionSchema }]),
         MongooseModule.forFeature([
        { name: TenantSchema.name, schema: tenantSchema },
        ]),
        MongooseModule.forFeature([
            { name: SipProfileSchema.name, schema: sipProfileSchema },
        ]),
        MongooseModule.forFeature( [
            { name: UserSchema.name, schema: userSchema },
            { name: ExtensionSchema.name, schema: extensionSchema },
            { name: TenantSchema.name, schema: tenantSchema },
            { name: ManagerSchema.name, schema: managerSchema },
            { name: LicenseSchema.name, schema: licenseSchema },
            { name: SipProfileSchema.name, schema: sipProfileSchema },
            { name: RolesSchema.name, schema: rolesSchema },
            
        ],
     ),
    forwardRef(() => ExtensionModule),
        forwardRef(() => TenantModule),
    ],
    controllers: [ UserController ],
    providers: [UserService, UserRabbitmqService],
    exports: [UserService, MongooseModule, UserRabbitmqService]
})
export class UserModule { }
