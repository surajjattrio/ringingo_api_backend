import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class Unread_whatsappmessageDto {

    // @ApiProperty()
    // // @IsNotEmpty()
    // @IsOptional()
    // from_number: string

    // @ApiProperty()
    // // @IsNotEmpty()
    // @IsOptional()
    // to: string

    // @ApiProperty()
    // // @IsNotEmpty()
    // @IsOptional()
    // message: string

    // @ApiProperty()
    // // @IsUUID()
    // @IsOptional()
    // message_uuid: string

    // @ApiProperty( { description: "0 - sent | 1 - delivered |2 -read", default: "0" } )
    // // @IsNumberString()
    // // @IsIn(["0","1","2"])
    // @IsOptional()
    // type: string

    // @ApiProperty()
    // @IsOptional()
    // @IsUUID()
    // tenant_uuid: string

    @ApiProperty()
    @IsOptional()
    @IsUUID()
    user_uuid: string

    // @IsOptional()
    // @IsUUID()
    // messaging_channel_uuid: string

    // @IsOptional()
    // @IsUUID()
    // messaging_queue_uuid: string

    // @IsOptional()
    // uuid: string

    // @IsOptional()
    // image: string

    // @IsOptional()
    // document: string

    // @IsOptional()
    // filename: string

    // @IsOptional()
    // phone_number_id: string

    // @IsOptional()
    // message_type: String
}
