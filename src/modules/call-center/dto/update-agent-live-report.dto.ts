import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID } from "class-validator";

export class UpdateAgentLiveReportDto {

    @IsOptional()
    agent_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    total_calls : any

    @ApiProperty({ description: '1 - Incoming Call | 2 - Outgoing Call | 3 - Break'})
    @IsNumberString()
    @IsIn(["0","1", "2" , "3" , "4" , "5" , "6", "7"])
    status: string

    @ApiProperty()
    @IsOptional()
    phone_number: string

    @ApiProperty()
    @IsOptional()
    campaign_name : string
    
    @ApiProperty()
    @IsOptional()
    campaign_type : string

    @IsOptional()
    type : string

    @ApiProperty()
    @IsOptional()
    campaign_uuid: string;

    @ApiProperty()
    @IsOptional()
    agent_name: string;

    @ApiProperty()
    @IsOptional()
    extension_uuid: string;

    @ApiProperty()
    @IsOptional()
    extension_name: string;

    @IsOptional()
    agent_logged_in_time : string

    @IsOptional()
    browserToken: string
}
