import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class CreateInboundCampaignDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty()
    @IsUUID()
    outgoing_rule_uuid: string

    /*@ApiProperty()
    @IsNumberString()
    @IsIn(["0","1"])
    sticky_agent : string*/

    @ApiProperty( { description: '0 - Active | 1 - Inactive', default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string


    /*  OPTIONAL FILEDS  */

    /*@ApiProperty()
    @ValidateIf(val => val.call_id_type != "")
    @IsNumberString()
    @IsIn(["0","1"])
    call_id_type : string*/

    @ApiProperty()
    @IsOptional()
    call_id_value: string

    @ApiProperty()
    @IsOptional()
    description: string


    @ApiProperty()
    //@ValidateIf(val => val.call_queue_uuid !="")
    //@IsUUID()
    @IsOptional()
    call_queue_uuid: string

    @IsOptional()
    caller_id_time: String

    @IsOptional()
    allow_ring_group_transfer: Object

    @IsOptional()
    allow_call_queue_transfer: Object

    @IsOptional()
    allow_ivr_transfer: Object

    @ApiProperty()
    @ValidateIf( val => val.three_way_caller_id != "" )
    @IsIn( [ "0", "1", "2" ] )
    three_way_caller_id: string

    @ApiProperty()
    @ValidateIf( val => val.recording != "" )
    @IsIn( [ "0", "1" ] )
    recording: string

    @ApiProperty()
    @ValidateIf( val => val.number_masking != "" )
    @IsIn( [ "0", "1" ] )
    number_masking: string

    @IsNotEmpty()
    tenant_uuid: string

    @IsOptional()
    campaign_type: string

    @IsOptional()
    custom_caller_id: string

    @IsOptional()
    role: string

    @IsOptional()
    created_flag: string


    @ApiProperty()
    // @IsUUID()
    @IsOptional()
    webform_uuid: string

    @ApiProperty()
    @IsOptional()
    wrap_up_time: string

    @ApiProperty()
    @IsOptional()
    wrap_up_disposition: string

    @ApiProperty()
    @IsOptional()
    @IsIn( [ "0", "1" ] )
    auto_answer: string

    @ApiProperty()
    @IsOptional()
    @IsString()
    is_limechat: string

    @ApiProperty()
    @IsOptional()
    @IsIn( [ "0", "1" ] )
    agent_script: string

    @ApiProperty()
    @IsOptional()
    agent_script_text: string

     @ApiProperty()
    @IsOptional()
    email_config_uuid: string

    @ApiProperty()
    @IsOptional()
    api_config_uuid: string

    @ApiProperty()
    @IsOptional()
    email_type: string

    @ApiProperty()
    @IsOptional()
    message_config_uuid: string
}
