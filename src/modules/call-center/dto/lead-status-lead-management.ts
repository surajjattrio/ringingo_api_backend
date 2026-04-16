import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID , IsOptional } from "class-validator";

export class LeadStatusLeadManagementDto {

    @ApiProperty()
    @IsNotEmpty()
    lead_status : string
   
    @ApiProperty()
    @IsOptional()
    // @IsNotEmpty()
    lead_status_1 : string

    @ApiProperty()
    @IsOptional()
    // @IsNotEmpty()
    lead_status_2 : string

    @ApiProperty()
    @IsUUID()
    campaign_uuid: string

    @IsOptional()
    user_uuid : String

    @IsOptional()
    code : string

    @IsOptional()
    tenant_uuid : string

    @IsOptional()
    custom_phone_number : string

    @IsOptional()
    pause : string

    @IsOptional()
    campaign_flag : string

    @IsOptional()
    custom_callid: string
}
