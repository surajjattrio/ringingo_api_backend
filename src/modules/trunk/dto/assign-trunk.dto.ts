import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class AssignTrunkDto {

    @ApiProperty()
    @IsNotEmpty()
    tenant_uuid : string
}