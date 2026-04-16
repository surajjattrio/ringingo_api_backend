import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsPort } from "class-validator";

export class CreateMailConfigurationDto {

    @ApiProperty()
    @IsNotEmpty()
    host : string

    @ApiProperty()
    @IsNotEmpty()
    username : string

    @ApiProperty()
    @IsNotEmpty()
    password : string

    @ApiProperty()
    @IsPort()
    port : string

    @ApiProperty()
    @IsNotEmpty()
    from : string


    /*@ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string*/

    @IsNotEmpty()
    tenant_uuid : string
}
