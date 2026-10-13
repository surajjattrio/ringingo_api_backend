import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExtensionSchema, extensionSchema } from "../extension/schema/extension.schema";
import { TrunkSchema, trunkSchema } from "../trunk/schema/trunk.schema";
import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";
import { CtcCallSchema, ctcCallSchema } from "./schema/ctc.schema";
import { CtcController } from "./controllers/ctc.controller";
import { CtcService } from "./services/ctc.service";
import { CtcApiKeyQueryMiddleware } from "./middlewares/ctc-api-key-query.middleware";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: ExtensionSchema.name, schema: extensionSchema }]),
        MongooseModule.forFeature([{ name: TrunkSchema.name, schema: trunkSchema }]),
        MongooseModule.forFeature([{ name: TenantSchema.name, schema: tenantSchema }]),
        MongooseModule.forFeature([{ name: CtcCallSchema.name, schema: ctcCallSchema }]),
    ],
    controllers: [CtcController],
    providers: [CtcService],
})
export class CtcModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(CtcApiKeyQueryMiddleware)
            .forRoutes({ path: "ctc/dial", method: RequestMethod.GET });
    }
}
