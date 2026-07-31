import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class VoiceBroadcastLeadGroupDto {

    @ApiProperty()
    @IsNotEmpty()
    lead_group_uuid : any

    @ApiProperty()
    @IsUUID()
    voice_broadcast_uuid : string

    @IsNotEmpty()
    tenant_uuid : string

    // @IsOptional()
    // main_broadcast : boolean
}