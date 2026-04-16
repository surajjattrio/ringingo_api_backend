import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class StartBroadcastDto {

    @ApiProperty()
    @IsUUID()
    voice_broadcast_uuid : String

    @IsOptional()
    tenant_uuid : string
}
