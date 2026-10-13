import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SmsProviderConfigController } from "./controllers/sms-provider-config.controller";
import { SmsProviderConfigSchema, smsProviderConfigSchema } from "./schema/sms-provider-config.schema";
import { SmsProviderConfigService } from "./services/sms-provider-config.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SmsProviderConfigSchema.name, schema: smsProviderConfigSchema },
        ])
    ],
    controllers: [SmsProviderConfigController],
    providers: [SmsProviderConfigService],
    exports: [MongooseModule, SmsProviderConfigService]
})
export class SmsProviderConfigModule { }
