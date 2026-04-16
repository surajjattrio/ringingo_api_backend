import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsNotEmpty, IsOptional } from "class-validator";


export class Whatsapp_available_agentDto {

    @ApiProperty()
    phone_number_id: string

    @ApiProperty()
    @IsNotEmpty()
    tenant_uuid: string

    @ApiProperty()
    @IsOptional()
    user_id: String

    @ApiProperty()
    browserToken: String //Platform WEB

    @ApiProperty()
    type: String
}

