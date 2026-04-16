import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsNotEmpty, IsOptional } from "class-validator";


export class ZohocrmDto {

    @ApiProperty()
    @IsNotEmpty()
    zoho_user_id: string


    @ApiProperty()
    @IsFQDN()
    tenant_domain: string

}


