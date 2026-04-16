import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID , IsNotEmpty , IsNumberString, IsIn} from "class-validator";

export class LeadManagementDistributionDto { 
    
    @ApiProperty()
    @IsNotEmpty()
    user_uuid : string;

    @ApiProperty()
    file : string

    @IsOptional()
    tenant_uuid : string

    @ApiProperty()
    @IsUUID()
    lead_group_uuid : string

    @ApiProperty({ description: '0 - By lead group | 1 - By Tenant', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    filter_by: string
    
    @IsOptional()    
    phone_code : string

    @IsOptional()
    custom_phone_number : string

    @IsOptional()
    manager_uuid: string
}
