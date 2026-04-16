import { forwardRef, Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MasterAdminModule } from "../master-admin/master-admin.module";
import { MasterAdmin, MasterAdminSchema } from "../master-admin/schema/master-admin";
import { tenantSchema, TenantSchema } from "../tenant/schema/tenant.schema";
import { JWTService } from "./jwt.service";
import { JwtAuthGuard } from "./jwt_auth_guard";
import { PassportLocalStrategy } from "./local.strategy";
import { VerifyJWT } from "./verify.jwt";
import { managerSchema, ManagerSchema } from "../manager/schema/manager.schema";
import { timezoneSchema, TimezoneSchema } from "../timezone/schema/timezone.schema";
import { sipProfileSchema, SipProfileSchema } from "../sip-profile/schema/sip-profile-schema";

@Global()
@Module({
    imports: [forwardRef(() => MasterAdminModule), MongooseModule.forFeature([{ name: MasterAdmin.name, schema: MasterAdminSchema }]),
    MongooseModule.forFeature([
	    { name : TenantSchema.name , schema : tenantSchema },
	    { name : ManagerSchema.name , schema : managerSchema },
	    { name: TimezoneSchema.name, schema: timezoneSchema },
	    { name: SipProfileSchema.name, schema: sipProfileSchema },

    ]),
    JwtModule.registerAsync({
        useFactory: async () => ({
            secret: process.env.SECRET_KEY,
            signOptions: { expiresIn: process.env.JWT_EXPIRE }
        }),
    })],
    providers: [PassportLocalStrategy, JWTService, VerifyJWT, {
        provide: APP_GUARD,
        useClass: JwtAuthGuard
    },
    ],
    exports: [JWTService]
})

export class AuthModule { }
