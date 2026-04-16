import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class BlendedCampaignDialableStatusDto {

    @ApiProperty()
    @IsUUID()
    blended_campaign_uuid : string

    @IsOptional()
    @ValidateIf(val => val.blended_campaign_uuid != "")
    @IsUUID()
    blended_campaign_disposition_uuid : string

    @IsOptional()
    @ValidateIf(val => val.disposition_uuid != "")
    @IsUUID()
    disposition_uuid : string

    @IsNotEmpty()
    tenant_uuid : string
}

