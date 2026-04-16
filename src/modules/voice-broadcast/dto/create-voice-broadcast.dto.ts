import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID } from "class-validator";
import { Date } from "mongoose";

export class CreateVoiceBroadcastDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty()
    @IsNumberString()
    caller_id_type: string

    @ApiProperty()
    @IsNotEmpty()
    caller_id: string

    @ApiProperty()
    // @IsNumberString()
    @IsNotEmpty()
    channel: Number

    @ApiProperty()
    @IsNumberString()
    max_retries: string

    @ApiProperty()
    @IsOptional()
    max_retries_disposition_uuid: string

    @ApiProperty( { description: '0 - Active | 1 - Inactive', default: "1" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "1" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    amd: string

    @ApiProperty( { description: '0 - Enable | 1 - Disable', default: "1" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    recording: string

    @ApiProperty()
    @IsNotEmpty()
    start_date: Date

    @ApiProperty()
    @IsNotEmpty()
    end_date: Date

    // @ApiProperty()
    // @IsNotEmpty()
    // start_schedule : Date

    // @ApiProperty()
    // @IsNotEmpty()
    // end_schedule : Date

    @ApiProperty()
    @IsUUID()
    welcome_prompt_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    welcome_prompt_selected_value: object

    @ApiProperty()
    @IsUUID()
    exit_prompt_uuid: string

    // @ApiProperty()
    // @IsUUID()
    // @IsNotEmpty()
    // outgoing_rule_uuid : string

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty( { message: 'Outgoing Rule cannot be blank. Please select a valid outgoing rule.' } )
    outgoing_rule_uuid: string;

    @ApiProperty( { description: '0 - Survey | 1 - IVR', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    broadcast_type: string

    @ApiProperty()
    @IsNotEmpty()
    survey_value: object

    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    ivr_uuid: string

    @ApiProperty()
    @IsOptional()
    timeout: string

    @ApiProperty()
    @IsOptional()
    playfile_time: string

    @ApiProperty()
    @IsOptional()
    skip: string

}
