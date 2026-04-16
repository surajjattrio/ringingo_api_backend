import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsFQDN, IsIn, IsNotEmpty, IsNumberString, IsStrongPassword, IsUUID, IsEmail, ValidateIf, IsOptional, IsString } from "class-validator";

export class CreateTenantDto {

    @ApiProperty()
    @IsNotEmpty()
    tenant_name: string

    @ApiProperty()
    @IsNotEmpty()
    username: string

    @ApiProperty({ description: "Password should contains total 8 characters (one small letter , one capital letter , one special character, one numeric) Example : Test@123" })
    @IsStrongPassword()
    password: string

    @ApiProperty()
    // @IsFQDN()
    @IsOptional()
    domain: string

    @ApiProperty({ description: '0 - Active | 1 - Inactive', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string

    @ApiProperty({ default: 0, description: 'You need to add uuid from timezone table' })
    @IsUUID()
    time_zone_uuid: string

    @ApiProperty({ description: 'You need to add uuid from roles table for that particular role' })
    @IsUUID()
    role_uuid: string

    @ApiProperty({ description: 'You need to add uuid from country table for that particular country' })
    @IsUUID()
    country_uuid: string

    @ApiProperty({ description: 'You need to add uuid from sip_profile table for that particular sip_profile' })
    @IsUUID()
    sip_profile_uuid: string

    // @ApiProperty()
    // @IsEmail()
    // email: string
    @ApiProperty()
    @IsOptional()
    @ValidateIf(o => o.email !== '')
    @IsEmail({}, { message: 'Invalid email' })
    email: string




    @ApiProperty()
    @ValidateIf(val => val.outgoing_rule_uuid != "")
    @IsUUID()
    outgoing_rule_uuid: string

    @ApiProperty()
    @ValidateIf(val => val.concurrent_calls != "")
    @IsNumberString()
    concurrent_calls: string

    @ApiProperty()
    @IsOptional()
    web_hook: string

    tenant_uuid?: string

    creation_uuid?: string

    update_uuid?: string

    role_name?: string

    @ApiProperty({ default: "1" })
    @IsNumberString()
    @IsIn(["0", "1"])
    add_anonymous_lead: string

    @IsOptional()
    account_code: string

    @IsOptional()
    system_disposition: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    company_code: string
}
