import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class VoiceBroadcastLeadGroupDto {

    @ApiProperty()
    @IsUUID()
    lead_group_uuid : string

    @ApiProperty()
    @IsUUID()
    voice_broadcast_uuid : string

    @IsNotEmpty()
    tenant_uuid : string

    // @IsOptional()
    // main_broadcast : boolean
}