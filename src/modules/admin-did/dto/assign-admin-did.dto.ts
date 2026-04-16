import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class AssignAdminDidDto {

    @ApiProperty()
    @IsNotEmpty()
    admin_did_uuid : string
}
