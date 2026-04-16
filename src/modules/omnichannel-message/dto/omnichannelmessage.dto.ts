import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class OmniChannelmessageDto {

    @ApiProperty()
    // @IsNotEmpty()
    @IsOptional()
    from_number: string

    @ApiProperty()
    // @IsNotEmpty()
    @IsOptional()
    channel_type: string

    @ApiProperty()
    // @IsNotEmpty()
    @IsOptional()
    to: string

    @ApiProperty()
    // @IsNotEmpty()
    @IsOptional()
    text_content: string

    @ApiProperty()
    // @IsUUID()
    @IsOptional()
    message_id: string

    @ApiProperty({ description: "text |image | document" })
    // @IsNumberString()
    // @IsIn(["0","1","2"])
    @IsOptional()
    text_type: string

    @ApiProperty()
    @IsOptional()
    @IsUUID()
    tenant_uuid: string

    @IsOptional()
    @IsUUID()
    user_uuid: string

    @IsOptional()
    @IsUUID()
    campaign_uuid: string

    @IsOptional()
    @IsUUID()
    messaging_channel_uuid: string

    @IsOptional()
    @IsUUID()
    messaging_queue_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    image_url: string[]

    @IsOptional()
    document_url: string[]

    @IsOptional()
    filename: string

    @IsOptional()
    phone_number_id: string

    @IsOptional()
    sender_instagram_id: string

    @ApiProperty({ description: "0 - send message  | 1 - receive message " })
    @IsOptional()
    message_type: String

    @IsOptional()
    timestamp: String

    @IsOptional()
    name: String

    @IsOptional()
    lead_management_uuid: String

    @ApiProperty({ description: "0 - sent | 1 - delivered |2 -read", default: "0" })
    @IsOptional()
    notification_type: String

    @IsOptional()
    template_name: String

    @IsOptional()
    template_language_code: String

    // @IsOptional()
    // messaging_queue_uuid: String

    @IsOptional()
    whatsapp_business_account_id: String

    @IsOptional()
    instagram_business_account_id: String

    @IsOptional()
    facebook_page_id: String

    @IsOptional()
    unread_message: String

    // @IsOptional()
    // whatsapp_messaging_channel_uuid: String

    @IsOptional()
    transfer_uuid: String

    @IsOptional()
    transfer_username: String

}