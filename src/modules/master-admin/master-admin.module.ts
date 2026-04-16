import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenant/tenant.module";
import { UserModule } from "../user/user.module";
import { MasterAdminController } from "./controllers/master-admin.controller";
import { PasswordHandlerController } from "./controllers/password-handler.controller";
import { MasterAdmin, MasterAdminSchema } from "./schema/master-admin";
import { PasswordHandlerService } from "./services/password-handler.service";
import { MailConfigurationModule } from "../mail-configuration/mail-configuration.module";
import { licenseSchema, LicenseSchema } from "./schema/license.schema";
import { CheckLicenseService } from "./services/check-license.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: MasterAdmin.name, schema: MasterAdminSchema },
      { name: LicenseSchema.name, schema: licenseSchema },
    ]),
    TenantModule,
    UserModule,
    MailConfigurationModule,
  ],
  controllers: [MasterAdminController, PasswordHandlerController],
  providers: [PasswordHandlerService, CheckLicenseService],
  exports: [MongooseModule,CheckLicenseService],
})
export class MasterAdminModule {}

