import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString } from "class-validator";

export class DndDto {

    @ApiProperty({description : "(Do not disturb) 0 - Enable | 1 - Disable" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    dnd : string
}