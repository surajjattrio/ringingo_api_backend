import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class LeadSkipDto {

    @ApiProperty()
    @IsUUID()
    campaign_uuid: string

    @IsOptional()
    agent_uuid: string

    @IsOptional()
    uuid : string

    @IsOptional()
    tenant_uuid : string
}
