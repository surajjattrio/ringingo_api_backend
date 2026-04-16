import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsStrongPassword } from "class-validator";

export class UpdatePasswordDto {

    @ApiProperty()
    @IsStrongPassword()
    password : string

    @ApiProperty()
    @IsNotEmpty()
    uuid : string

    @ApiProperty()
    @IsIn(["tenant","agent"])
    entity : string
}
