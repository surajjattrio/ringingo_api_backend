import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString, IsOptional, ValidateIf } from "class-validator";

export class LoggedInUserDto {
    
    @IsOptional()
    @ValidateIf(val => val.is_logged_in !="")
    @IsNumberString()
    @IsIn(["0","1"])
    is_logged_in : string

    @IsOptional()
    @ValidateIf(val => val.is_logged_in_mobile !="")
    @IsNumberString()
    @IsIn(["0","1"])
    is_logged_in_mobile : string
}
