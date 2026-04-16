// import { ApiProperty } from "@nestjs/swagger";
// import {
//   IsNotEmpty,
//   IsUUID,
//   IsString,
//   IsIn,
//   IsOptional,
//   IsDateString,
// } from "class-validator";

// export class CreateOmniChannelReportDto {
//   @ApiProperty()
//   @IsNotEmpty()
//   @IsUUID()
//   tenant_uuid: string;

//   @ApiProperty()
//   @IsNotEmpty()
//   @IsUUID()
//   user_uuid: string;

//   @ApiProperty()
//   @IsNotEmpty()
//   @IsString()
//   user_name: string;

//   @ApiProperty()
//   @IsOptional()
//   @IsString()
//   customer_name?: string;

//   @ApiProperty()
//   @IsNotEmpty()
//   @IsString()
//   customer_number: string;

//   @ApiProperty()
//   @IsNotEmpty()
//   @IsIn(["whatsapp", "instagram", "facebook"])
//   channel_type: string;

//   @ApiProperty()
//   @IsOptional()
//   @IsString()
//   campaign_type?: string;

//   @ApiProperty()
//   @IsOptional()
//   @IsUUID()
//   campaign_uuid?: string;


//   @ApiProperty()
//   @IsNotEmpty()
//   @IsDateString()
//   chat_date: string;
// }


import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDate } from "class-validator";
import { Type } from "class-transformer";

export enum ChannelTypeEnum {
  WHATSAPP = "WhatsApp",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
}

export class CreateOmniChannelReportDto {
  // Tenant
  @IsString()
  @IsNotEmpty()
  tenant_uuid: string;

  // Agent / User
  @IsString()
  @IsNotEmpty()
  user_uuid: string;

  // Lead Management
  @IsOptional()
  @IsString()
  lead_management_uuid?: string;

  // Customer Phone
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  // Channel Type
  @IsEnum(ChannelTypeEnum)
  channel_type: ChannelTypeEnum;

  // Campaign
  @IsOptional()
  @IsString()
  campaign_uuid?: string;

  // Chat Date
  // @IsNotEmpty()
  // @Type(() => Date)
  // @IsDate()
  // chat_date: Date;
}
