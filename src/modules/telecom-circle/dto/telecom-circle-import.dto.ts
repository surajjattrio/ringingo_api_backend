import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID , IsIn, IsNumberString } from "class-validator";

export class TelecomCircleImportDto { 
    
    @ApiProperty()
    // @IsUUID()
    tenant_uuid : string

    @ApiProperty()
    file : string

    // @ApiProperty({description: '0 - By lead group | 1 - By Tenant' , default : "0"})
    // @IsNumberString()
    // @IsIn(["0","1","2","3"])
    // filter_by : string

}

