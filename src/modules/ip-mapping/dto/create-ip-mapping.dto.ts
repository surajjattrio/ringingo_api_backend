import { ApiProperty } from "@nestjs/swagger";
import { IsIP, IsNotEmpty, IsOptional , IsNumberString , IsIn } from "class-validator";

export class CreateIpMappingDto {

    @ApiProperty()
   //@IsIP()
   @IsOptional()
    ip : string

    @ApiProperty()
    @IsOptional()
    prefix : string
    
    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @IsNotEmpty()
    tenant_uuid
}
