import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID , IsIn, IsNumberString } from "class-validator";

export class LeadManagementImportDto { 
    
    @ApiProperty()
    @IsUUID()
    lead_group_uuid : string

    @ApiProperty()
    file : string

    @IsOptional()
    tenant_uuid : string

    @ApiProperty({description: '0 - By lead group | 1 - By Tenant' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1","2","3"])
    filter_by : string

    @IsOptional()
    phone_code : string

    @IsOptional()
    custom_fields: any

    @IsOptional()
    manager_uuid: string

}
