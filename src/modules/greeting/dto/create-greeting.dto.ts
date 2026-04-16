import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , IsOptional , ValidateIf } from "class-validator";

export class CreateGreetingDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    tenant_uuid : string

    @ApiProperty()
    file : string

    @IsOptional()
    uuid : string

    @IsOptional()
    originalName : string

    @IsOptional()
    role : string
    
    @IsOptional()
    manager_uuid : string
}
