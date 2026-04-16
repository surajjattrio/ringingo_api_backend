import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";

export class CreateManualDialDto {

  
    @ApiProperty()
    @IsOptional()
    campaign_uuid : string

    @ApiProperty()
    @IsNumberString()
    dial_number : string

    @IsOptional()
    campaign_type : string

    @IsOptional()
    phone_number : string

    @IsOptional()
    lead_group_uuid : string

    @IsOptional()
    first_name: string

    @IsOptional()
    last_name: string

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    custom_phone_number: string

    @IsOptional()
    campaign_flag: string

}
