import { ApiProperty } from "@nestjs/swagger";
import {  IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";
import { ArrayExpression } from "mongoose";

let extension_list = [
    {
        "extension_type": "02",
        "extension": "123456",
    }
]

export class CreateRinggroupDto {

    @ApiProperty()
    @IsNotEmpty()   
    name : string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid !="")
    @IsUUID()
    user_uuid : string

    @ApiProperty({description : "0 - Yes | 1 - No" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    type : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string
    
    @ApiProperty()
    @IsOptional()
    sticky_agent : string

    @ApiProperty({default : "0"})
    @IsNumberString()
    timeout : string

    @ApiProperty({ default: extension_list})
    @IsNotEmpty()
    extension_list: ArrayExpression

    @ApiProperty()
    @IsUUID()
    tenant_uuid : string

    @ApiProperty()
    @IsUUID()
    greeting_uuid : string

    @ApiProperty()
    @IsNotEmpty()
    for_pbx : string

    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @IsOptional()
    role : string

}
