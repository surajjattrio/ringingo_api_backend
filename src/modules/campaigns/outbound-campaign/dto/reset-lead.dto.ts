import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID, IsOptional } from "class-validator";

export class ResetLeadDto {
    
    @ApiProperty()
    @IsUUID()
    lead_group_uuid : string

    @ApiProperty()
    @IsUUID()
    campaign_uuid : string

    @IsNotEmpty()
    tenant_uuid : string

    @ApiProperty()
    @IsOptional()
    disposition_uuid?: string;

    @ApiProperty()
    @IsOptional()
    disposition_uuids?: string[];
}
