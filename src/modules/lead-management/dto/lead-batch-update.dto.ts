import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";

export class LeadBatchUpdateDto {

    @ApiProperty()
    @ValidateIf( val => val.user_uuid != "" )
    @IsOptional()
    @IsUUID()
    user_uuid: string
    
    @ApiProperty()
    @ValidateIf( val => val.user_uuid_filter != "" )
    @IsOptional()
    @IsUUID()
    user_uuid_filter: string

    @ApiProperty()
    @ValidateIf( val => val.lead_status != "" )
    @IsOptional()
    @IsUUID()
    lead_status: string
    
    @ApiProperty()
    @ValidateIf( val => val.lead_status_filter != "" )
    @IsOptional()
    @IsUUID()
    lead_status_filter: string

    @ApiProperty()
    @ValidateIf( val => val.lead_group_uuid != "" )
    @IsOptional()
    @IsUUID()
    lead_group_uuid: string
    
    @ApiProperty()
    @ValidateIf( val => val.lead_group_uuid_filter != "" )
    @IsOptional()
    @IsUUID()
    lead_group_uuid_filter: string

    @IsOptional()
    tenant_uuid: string

    /* Param which we get from advanced search */

    @ApiProperty()
    @IsOptional()
    first_name: string

    @ApiProperty()
    @IsOptional()
    last_name: string

    @ApiProperty()
    @IsOptional()
    phone_number: string

    @ApiProperty()
    @IsOptional()
    phone_code: string

    @ApiProperty()
    @IsOptional()
    searchFlag: number


    @ApiProperty()
    @IsOptional()
    first_name_flag: string

    @ApiProperty()
    @IsOptional()
    last_name_flag: string

    @ApiProperty()
    @IsOptional()
    phone_number_flag: string

    @ApiProperty()
    @IsOptional()
    phone_code_flag: string
}
