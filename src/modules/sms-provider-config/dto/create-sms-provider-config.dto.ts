import { ApiProperty } from "@nestjs/swagger";
import {
    IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, Max, Min
} from "class-validator";
import { SMS_AUTH_TYPES, SMS_HTTP_METHODS, SMS_PROVIDER_TIMEOUT_HARD_CAP_MS } from "../schema/sms-provider-config.schema";

export class CreateSmsProviderConfigDto {

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ required: false, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty()
    @IsNotEmpty()
    @IsUrl({ protocols: ["https"], require_protocol: true })
    baseUrl: string;

    @ApiProperty({ required: false, enum: SMS_HTTP_METHODS, default: "POST" })
    @IsOptional()
    @IsIn(SMS_HTTP_METHODS as unknown as string[])
    method?: string;

    @ApiProperty({ enum: SMS_AUTH_TYPES })
    @IsNotEmpty()
    @IsIn(SMS_AUTH_TYPES as unknown as string[])
    authType: string;

    @ApiProperty({ description: "Plain credential fields (e.g. { apiKey, username, password }) — encrypted before storage, never returned by GET" })
    @IsObject()
    credentials: Record<string, string>;

    @ApiProperty({ required: false, type: Object })
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiProperty({ required: false, type: Object })
    @IsOptional()
    @IsObject()
    queryParams?: Record<string, string>;

    @ApiProperty({ type: Object, description: "Request body shape with {{to}}, {{senderId}}, {{templateId}} and any {{variables}} placeholders" })
    @IsNotEmpty()
    @IsObject()
    bodyTemplate: Record<string, any>;

    @ApiProperty({ required: false, type: [String], description: "Placeholder names used inside both bodyTemplate ({{name}}) and templateBody ({#name#})" })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    variables?: string[];

    @ApiProperty({ description: "DLT-approved header" })
    @IsNotEmpty()
    @IsString()
    senderId: string;

    @ApiProperty({ description: "DLT / provider-side registered template id" })
    @IsNotEmpty()
    @IsString()
    providerTemplateId: string;

    @ApiProperty({ description: "Registered body with {#var#} placeholders — stored for preview and length validation only" })
    @IsNotEmpty()
    @IsString()
    templateBody: string;

    @ApiProperty({ required: false, default: 5000 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(SMS_PROVIDER_TIMEOUT_HARD_CAP_MS)
    timeoutMs?: number;

    @ApiProperty({ required: false, type: Object, description: "{ statusMin, statusMax, jsonPath?, expectedValue? }" })
    @IsOptional()
    @IsObject()
    successCondition?: Record<string, any>;

    @ApiProperty({ required: false, description: "Dot path to the provider's message id in its response, e.g. data.messageId" })
    @IsOptional()
    @IsString()
    messageIdPath?: string;
}
