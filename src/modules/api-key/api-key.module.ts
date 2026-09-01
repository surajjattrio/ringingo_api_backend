import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApiKeyController } from "./controllers/api-key.controller";
import { ApiKeyService } from "./services/api-key.service";
import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: TenantSchema.name, schema: tenantSchema }]),
    ],
    controllers: [ApiKeyController],
    providers: [ApiKeyService],
    exports: [ApiKeyService],
})
export class ApiKeyModule { }
