import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsNotEmpty, IsOptional } from "class-validator";


export class ZohocrmcdrsDto {


    @ApiProperty()
    @IsOptional()
    mobile: string

    @ApiProperty()
    @IsOptional()
    phone: string

    @ApiProperty()
    @IsFQDN()
    tenant_domain: string

}


