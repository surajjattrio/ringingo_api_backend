import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsArray, IsIn, IsMobilePhone, IsNotEmpty, IsNumberString, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class CreateLeadManagementDto {

    @ApiProperty()
    @ValidateIf(val => val.lead_group_uuid !== '')
    @IsUUID()
    lead_group_uuid: string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid !== '')
    @IsUUID()
    user_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    first_name: string

    @ApiProperty()
    @IsOptional()
    last_name: string

    @ApiProperty()
    @IsOptional()
    address: string

    @ApiProperty()
    @IsOptional()
    city: string

    @ApiProperty()
    // @IsMobilePhone()
    @IsNotEmpty()
    phone_number: string

    /*@ApiProperty({ description: '0 - Active | 1 - Inactive', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string*/

    @ApiProperty()
    @IsOptional()
    lead_status: string
   
    @ApiProperty()
    @IsOptional()
    lead_status_1: string
   
    @ApiProperty()
    @IsOptional()
    lead_status_2: string

    @ApiProperty({ default: "" })
    @IsOptional()
    state: string

    @ApiProperty({ default: "" })
    @IsOptional()
    province: string

    @ApiProperty()
    @ValidateIf(val => val.postal_code !== '')
    @IsNumberString()
    postal_code: string

    @ApiProperty({ default: "" })
    @IsOptional()
    dob: string

    @ApiProperty({ default: "" })
    @IsOptional()
    phone_code: string

    @ApiProperty()
    @ValidateIf(val => val.alternate_phone_number !== '')
    @IsMobilePhone()
    alternate_phone_number: string

    @ApiProperty()
    @ValidateIf(val => val.email !== '')
    @IsEmail()
    email: string

    @ApiProperty()
    @ValidateIf(val => val.country_uuid !== '')
    @IsUUID()
    country_uuid: string

    @ApiProperty({ description: '0 - Male | 1 - Female' })
    @ValidateIf(val => val.gender !== '')
    @IsNumberString()
    @IsIn(["0", "1"])
    gender: string

    @ApiProperty()
    @IsOptional()
    description: string

    @IsNotEmpty()
    tenant_uuid: String

    @IsOptional()
    role: String

    @IsOptional()
    created_flag: string

    @IsOptional()
    uuid: string

    @IsOptional()
    campaign_uuid: String

    @IsOptional()
    lead_management_uuid: string

    @IsOptional()
    from: String

    @IsOptional()
    cdrs_uuid: String

    @IsOptional()
    custom_phone_number: string

    @IsOptional()
    in_dnc: string

    @IsOptional()
    @IsUUID()
    manager_uuid: String

    @IsOptional()
    custom_fields: any

    @IsOptional()
    campaign_flag: string

    @IsOptional()
    webhook: boolean

    @IsOptional()
    assigned_agent_uuid: string

    @ApiProperty({ default: false, description: 'When true, auto-queue this lead into the linked voice broadcast right after creation' })
    @IsOptional()
    @IsBoolean()
    vb_auto_churn: boolean

    @ApiProperty({ description: 'Optional. If omitted, the active voice broadcast linked to lead_group_uuid is resolved automatically' })
    @ValidateIf(val => val.voice_broadcast_uuid !== '')
    @IsOptional()
    @IsUUID()
    voice_broadcast_uuid: string

    // @IsOptional()
    // DebtorAccount: any

    // @IsOptional()
    // Employee: any

    // @IsOptional()
    // MiddleName: any

    // @IsOptional()
    // SSN: any

    // @IsOptional()
    // ClientName: any

    // @IsOptional()
    // Balance: any

    // @IsOptional()
    // AmountPlaced: any

    // @IsOptional()
    // AmountPaid: any

    // @IsOptional()
    // HomePhone: any

    // @IsOptional()
    // NumberMultiples: any

    // @IsOptional()
    // ScheduleDate: any

    // @IsOptional()
    // DialerList: any
}

