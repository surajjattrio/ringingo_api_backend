import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, IsUUID } from "class-validator";

export class AddCallerIdDto {

    @IsNotEmpty()
    tenant_uuid : string

    @ApiProperty()
    @IsNumberString()
    caller_id : string

    @ApiProperty()
    @IsUUID()
    caller_id_group_uuid : string
}
