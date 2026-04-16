import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class DeleteLeadGroupDto {

    @ApiProperty()
    @IsUUID()
    lead_group_uuid : String

    @ApiProperty()
    @IsUUID()
    campaign_uuid : string

    @IsOptional()
    tenant_uuid : string
}
