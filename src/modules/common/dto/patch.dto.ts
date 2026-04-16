import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString } from "class-validator";

export class PatchDto {
    @ApiProperty()
    @IsNumberString()
    @IsIn(["0","1"])
    status : string
}