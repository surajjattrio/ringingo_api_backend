import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class UpdateLeadStatusSentDto {
    
    @ApiProperty()
    @IsUUID()
    campaign_uuid: string

    @ApiProperty()
    @IsUUID()
    lead_management_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    tenant_uuid: string
}
