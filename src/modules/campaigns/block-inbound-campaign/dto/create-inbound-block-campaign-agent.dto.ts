import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

export class CreateInboundBlockCampaignAgentDto {

     @ApiProperty()
     name: string

     @ApiProperty()
     type: string

     @ApiProperty()
     @IsNotEmpty()
     type_value: string

     @ApiProperty()
     status: string

     @IsNotEmpty()
     tenant_uuid: string

     @IsOptional()
     user_uuid: string
}

