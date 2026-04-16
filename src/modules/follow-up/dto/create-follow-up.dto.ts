import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class CreateFollowUpDto {

    @ApiProperty()
    @IsUUID()
    lead_management_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    type: string

    @ApiProperty()
    @IsNotEmpty()
    date_time: any

    @ApiProperty()
    @IsOptional()
    user_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    reminder_date_time: any

    @IsOptional()
    created_flag: string

    @IsOptional()
    role: string

    @ApiProperty()
    @IsNotEmpty()
    comment: string

    @ApiProperty( { default: "1", description: "0 - Want to reschedule | 1 - No reschedule" } )
    @IsOptional()
    is_reschedule: string

    @IsOptional()
    reschedule_details: string

    @IsOptional()
    is_readed: string
}
