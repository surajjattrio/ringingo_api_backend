import { IsOptional, IsString } from "class-validator";

export class CreateApiKeyDto {
    @IsString()
    @IsOptional()
    tenant_uuid: string;
}
