import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString } from "class-validator";
export class MissedCallAlertDto {

    @ApiProperty({description : "0 - Enable | 1 - Disable" , default : "1"})
    @IsNumberString()
    @IsIn(["0","1"])
    recording : string
}