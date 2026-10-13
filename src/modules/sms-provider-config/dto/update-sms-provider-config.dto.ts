import { PartialType } from "@nestjs/swagger";
import { CreateSmsProviderConfigDto } from "./create-sms-provider-config.dto";

export class UpdateSmsProviderConfigDto extends PartialType(CreateSmsProviderConfigDto) { }
