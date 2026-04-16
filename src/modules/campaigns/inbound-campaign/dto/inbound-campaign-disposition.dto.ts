import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class InboundCampaignDispositionDto {

    @ApiProperty()
    @IsUUID()
    inbound_campaign_uuid : string

    @ApiProperty()
    @IsNotEmpty()
    name : string
    
    @ApiProperty()
    @IsOptional()
    code : string

    @IsNotEmpty()
    tenant_uuid : string
}
