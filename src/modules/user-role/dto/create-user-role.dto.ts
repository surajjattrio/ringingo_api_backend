import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID } from "class-validator";

export class CreateUserRoleDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty( { description: '0 - Active | 1 - Inactive', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    pbx_mode: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    call_center_mode: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    call_report: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    login_logout_report: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "1" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    sticky_agent: string

    @IsNotEmpty()
    tenant_uuid?: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    recording: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    number_masking: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    unallocated_leads: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    follow_up: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    settings: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    breakcode: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "1" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    force_login: string

    @IsOptional()
    manager_uuid: string

    @IsOptional()
    role: string

    @IsOptional()
    whatsapp: string

    @IsOptional()
    instagram: string

    @IsOptional()
    facebook: string

    @IsOptional()
    sms: string

    @ApiProperty()
    @IsOptional()
    @IsIn( [ "0", "1" ] )
    agent_script: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "1" } )
    @IsOptional()
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    auto_logout: string

    @ApiProperty()
    @IsOptional()
    idle_timeout: string
}
