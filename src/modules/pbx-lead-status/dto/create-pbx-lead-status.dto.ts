import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

export class CreatePbxLeadStatusDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string
    
    @ApiProperty()
    @IsOptional()
    code : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @IsNotEmpty()
    tenant_uuid : string

    @IsNotEmpty()
    role : string

    @IsOptional()
    created_flag : string
}
