import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsIn, IsNotEmpty, IsNumberString, IsStrongPassword, IsUUID, IsOptional, IsString, IsArray, ValidateNested } from "class-validator";

export class OmniMessagingChannelDto {
    @IsString()
    value: string;

    @IsString()
    label: string;
}

export class CreateUserDto {

    @ApiProperty()
    @IsNotEmpty()
    username: string

    @ApiProperty()
    @IsNotEmpty()
    fullname: string

    @ApiProperty()
    @IsEmail()
    email: string

    @ApiProperty({ description: "Password should contains total 8 characters (one small letter , one capital letter , one special character, one numeric) Example : Test@123" })
    @IsStrongPassword()
    password: string

    @ApiProperty({ description: 'You need to add uuid from roles table for that particular role' })
    @IsUUID()
    user_role_uuid: string

    @ApiProperty()
    @IsUUID()
    user_group_uuid: String

    @IsNotEmpty()
    tenant_uuid: string

    @ApiProperty({ default: 30 })
    @IsNumberString()
    default_timeout: string

    @ApiProperty({ default: 0 })
    @IsNumberString()
    @IsIn(["0", "1"])
    recording: string

    @ApiProperty({ default: 0 })
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string

    @ApiProperty({ default: "", description: "0 - Extension | 1 - PSTN" })
    @IsOptional()
    extension_type: string

    @ApiProperty()
    @IsOptional()
    default_extension: string

    @IsOptional()
    is_logged_in: string

    @IsOptional()
    role: string

    @IsOptional()
    manager_uuid: string

    @IsOptional()
    zoho_user_id: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OmniMessagingChannelDto)
    omni_messaging_channel_uuid?: OmniMessagingChannelDto[];
    // whatsapp_messaging_channel_uuid: string

    @IsOptional()
    browserToken: String //Platform WEB

    @IsOptional()
    campaign_uuid: string

    @IsOptional()
    allowed_campaign: any

    @IsOptional()
    create_sip_device : String

    @IsOptional()
    @IsString()
    caller_id_name?: string;
    
    @IsOptional()
    @IsString()
    caller_id_number?: string;
}
