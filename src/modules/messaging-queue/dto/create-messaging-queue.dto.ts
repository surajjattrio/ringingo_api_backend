import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class CreateMessagingQueueDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty( { description: "1 - Pbx | 0 - Call Centre", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    type: string

    // @ApiProperty()
    // // @IsNotEmpty()
    // extensions_uuid: string

    // @ApiProperty( { default: [] } )
    // @IsNotEmpty()
    // messaging_queue_extensions: Object[];

    @ApiProperty()
    @IsNotEmpty()
    messaging_queue_extensions: string[]

    // @ApiProperty()
    // @IsNotEmpty()
    // provider: string

    // @ApiProperty( { default: [] } )
    // @IsNotEmpty()
    // messaging_queue_channel: Object[];

    @ApiProperty()
    @IsNotEmpty()
    messaging_queue_channel: string[]

    @ApiProperty( { description: "0 - Active | 1 - Inactive", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    @ApiProperty()
    @IsUUID()
    tenant_uuid: string

    @ApiProperty()
    uuid: string

    @IsOptional()
    @IsUUID()
    manager_uuid: string

    @IsOptional()
    role: string

}
