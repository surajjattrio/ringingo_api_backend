import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn , IsNotEmpty, IsNumberString , IsUUID , IsOptional } from "class-validator";


export class CreateClickToCallDto {

    @ApiProperty()
    @IsOptional()
    name : string

    @ApiProperty()
    @IsOptional()
    url : string

    @ApiProperty()
    @IsOptional()
    device_number : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsUUID()
    tenant_uuid : string

    @ApiProperty()
    @IsOptional()
    category : string

    @ApiProperty()
    @IsOptional()
    tts_script : string

    @ApiProperty()
    @IsNotEmpty()
    @IsOptional()
    domain : string

    @ApiProperty()
    @IsNumberString()
    callier_id_number : string

    @ApiProperty()
    @IsUUID()
    user_uuid : string

    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @IsOptional()
    role : string
    
  
}