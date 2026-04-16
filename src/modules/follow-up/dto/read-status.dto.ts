import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString } from "class-validator";

export class ReadStatusDto {

    @ApiProperty()
    @IsNumberString()
    @IsIn(["0","1","2"])
    is_readed: string
}
