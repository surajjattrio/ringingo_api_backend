import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString, IsNotEmpty, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class ResumeDto {

    @ApiProperty()
    @IsUUID()
    campaign_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    sip_uri: string

    @ApiProperty()
    /*@ValidateIf(val => val.campaign_mode !== null || val.campaign_mode !== "null")
    @IsIn(["1","3"])
    @IsNumberString()*/
    @IsOptional()
    campaign_mode: string

    @IsOptional()
    agent_uuid: string

    @IsNotEmpty()
    uuid: string

    @IsNotEmpty()
    tenant_uuid: string

    @ApiProperty()
    @IsOptional()
    username: string

    @IsOptional()
    domain: string

    @IsOptional()
    concurrent_calls: string

    @IsOptional()
    role: string

    @IsOptional()
    manager_uuid : string

    @IsOptional()
    campaign_flag: string

}

