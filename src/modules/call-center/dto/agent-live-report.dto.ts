import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID } from "class-validator";

export class AgentLiveReportDto {

    @IsOptional()
    agent_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    agent_logged_in_time : string

    @IsOptional()
    total_calls : string

    @ApiProperty({ description: '0 - Logged in | 1 - On break | 2 - Logged out', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1", "2"])
    agent_status: string

    @ApiProperty()
    @IsOptional()
    campaign_uuid: string
    
    @ApiProperty()
    @IsOptional()
    break_name: string
   
    @ApiProperty()
    @IsOptional()
    break_duration: string

    @ApiProperty()
    @IsOptional()
    campaign_name: string

    @ApiProperty()
    @IsNotEmpty()
    agent_name: string

    @ApiProperty()
    @IsUUID()
    extension_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    extension_name: string

    @ApiProperty()
    @IsOptional()
    phone_number: string

    @ApiProperty()
    @IsOptional()
    campaign_type: string

    @ApiProperty()
    @IsOptional()
    agent_idle_time:string
    /*@ApiProperty()
    @IsOptional()
    direction: string*/
}
