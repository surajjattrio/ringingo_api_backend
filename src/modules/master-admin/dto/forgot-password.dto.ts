import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsIn, IsNotEmpty, ValidateIf } from "class-validator";

export class ForgotPasswordDto {

    @ApiProperty()
    @IsNotEmpty()
    username : string

    @ApiProperty()
    @IsIn(["tenant","agent"])
    entity : string

    @ApiProperty()
    @ValidateIf(val => val.entity == "agent")
    @IsFQDN()
    tenant_domain : string
}
