import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QueueDetailDto {
    @IsString()
    @IsNotEmpty()
    uuid: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    timeout: string;
}

export class InboundCallQueueDto {

    @ApiProperty()
    @IsNotEmpty()
    extension: string

    @IsOptional()
    domain: string

    @IsOptional()
    pause: string

    @ApiProperty()
    @IsUUID()
    // @IsOptional()
    campaign_uuid: string

    @IsOptional()
    lead_management_uuid: string

    @IsOptional()
    lead_status: string
    
    @IsOptional()
    lead_status_1: string
    
    @IsOptional()
    lead_status_2: string

    @IsOptional()
    campaign_type: string

    @IsOptional()
    code: string

    @IsOptional()
    custom_phone_number: string

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    wrap_up_time: String

    @IsOptional()
    wrap_up_time_duration: String

    @IsOptional()
    @IsArray()
    selected_queues: any[];

    @IsOptional()
    custom_callid: String
}
