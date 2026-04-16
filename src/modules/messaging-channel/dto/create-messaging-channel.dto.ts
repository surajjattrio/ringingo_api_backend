import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class CreateMessagingChannelDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty()
    @IsNotEmpty()
    type: string

    @ApiProperty()
    @IsNotEmpty()
    provider: string

    @ApiProperty( { description: "0 - Active | 1 - Inactive", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    @ApiProperty()
    @IsUUID()
    tenant_uuid: string

    @ApiProperty()
    uuid: string

    @ApiProperty( { default: [] } )
    @IsNotEmpty()
    customFields: Object[];

    @IsOptional()
    @IsUUID()
    manager_uuid: string

    @IsOptional()
    role: string

    // @IsOptional()
    // whatsapp_business_account_id: String
}
