import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsNotEmpty, IsOptional } from "class-validator";


export class AgentDto {

    @ApiProperty()
    @IsNotEmpty()
    username: string

    @ApiProperty()
    @IsNotEmpty()
    password: string

    @ApiProperty()
    @IsOptional()
    tenant_domain: string

    @ApiProperty()
    @IsOptional()
    company_code: string

    @ApiProperty()
    @IsOptional()
    device_id: String

    @IsOptional()
    callkit_token: String //Android

    @IsOptional()
    apns_token: String //IOS

    @IsOptional()
    mobile_type: String //Platform OS

    @IsOptional()
    browserToken: String //Platform WEB
    
      @ApiProperty()
    @IsNotEmpty()
    campaign_uuid: string
}
