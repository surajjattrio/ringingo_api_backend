import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
export class StartRescanProfileDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string
}
