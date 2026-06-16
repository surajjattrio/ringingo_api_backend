import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class CreateOutboundCampaignDto {

  @ApiProperty()
  @IsNotEmpty()
  name: string

  @ApiProperty()
  @IsNumberString()
  @IsIn( [ "0", "1", "2", "3" ] )
  dial_method: string

  @ApiProperty()
  @IsUUID()
  lead_group_uuid: string

  @ApiProperty()
  @IsUUID()
  outgoing_rule_uuid: string

  @ApiProperty()
  @IsNumberString()
  @IsIn( [ "0", "1" ] )
  status: string

  /*OPTIONAL FILEDS*/

  @ApiProperty()
  @ValidateIf( val => val.call_id_type != "" )
  @IsNumberString()
  @IsIn( [ "0", "1", "2", "3", "4" ] )
  call_id_type: string

  @ApiProperty()
  @IsOptional()
  call_id_value: string

  @ApiProperty()
  @IsOptional()
  description: string

  @ApiProperty()
  @IsOptional()
  concurrent_call: string

  @ApiProperty()
  @ValidateIf( val => val.manual_outgoing_rule_uuid != "" )
  @IsUUID()
  @IsOptional()
  manual_outgoing_rule_uuid: string

  @ApiProperty()
  @ValidateIf( val => val.threeway_outgoing_rule_uuid != "" )
  @IsUUID()
  @IsOptional()
  threeway_outgoing_rule_uuid: string

  /*@ApiProperty()
  @ValidateIf(val => val.call_retries !="")
  @IsNumberString()
  call_retries : string*/

  @ApiProperty( { default: "0" } )
  @ValidateIf( val => val.timeout != "" )
  @IsNumberString()
  timeout: string

  @ApiProperty( { default: "0" } )
  @ValidateIf( val => val.agent_timeout != "" )
  @IsOptional()
  @IsNumberString()
  agent_timeout: string

  @ApiProperty()
  @IsOptional()
  max_dial_level: string

  @ApiProperty()
  @ValidateIf( val => val.greeting_uuid != "" )
  @IsUUID()
  greeting_uuid: string

  @ApiProperty()
  @ValidateIf( val => val.recording != "" )
  @IsIn( [ "0", "1" ] )
  recording: string

  @ApiProperty()
  @ValidateIf( val => val.number_masking != "" )
  @IsIn( [ "0", "1" ] )
  number_masking: string

  @ApiProperty()
  @IsOptional()
  auto_answer: string

  @IsNotEmpty()
  tenant_uuid: string

  @ApiProperty( { default: "3" } )
  @IsNumberString()
  max_retries: string

  @ApiProperty( { default: 0 } )
  @IsNumberString()
  @IsOptional()
  total_leads_count: number

  @ApiProperty( { default: 0 } )
  @IsNumberString()
  @IsOptional()
  leads_in_queue_count: number

  @ApiProperty( { default: "10" } )
  @IsNumberString()
  retries_time: string

  @IsOptional()
  campaign_type: string

  @ApiProperty( { default: "0" } )
  @ValidateIf( val => val.caller_id_time != "" )
  // @IsNumberString()
  caller_id_time: string

  @ApiProperty()
  @IsNumberString()
  @IsIn( [ "0", "1", "2" ] )
  three_way_caller_id: string

  @ApiProperty()
  @IsOptional()
  allow_ring_group_transfer: Object

  @ApiProperty()
  @IsOptional()
  allow_call_queue_transfer: Object

  @ApiProperty()
  @IsOptional()
  allow_ivr_transfer: Object

  @ApiProperty()
  @IsOptional()
  max_retries_disposition: String

  @ApiProperty()
  @IsOptional()
  //@IsNumberString()
  target_drop_percentage: String

  @ApiProperty()
  @IsOptional()
  //@IsNumberString()
  max_predictive_call_count: String

  @ApiProperty()
  @IsNumberString()
  @IsIn( [ "0", "1" ] )
  answering_machine_detection: String

  @ApiProperty()
  @IsNotEmpty()
  cps: number

  @IsOptional()
  custom_caller_id: string

  @IsOptional()
  call_queue_uuid: string;

  @IsOptional()
  ring_group_uuid: string;

  @ApiProperty()
  @IsOptional()
  amd_promptuuid: string

  @ApiProperty()
  //@IsNumberString()
  //@IsIn(["0","1"])
  @IsOptional()
  lead_type: string

  @IsOptional()
  role: string

  @IsOptional()
  created_flag: string

  @ApiProperty()
  @IsOptional()
  webform_uuid: Object

  @ApiProperty()
  @IsOptional()
  wrap_up_time: string

  @ApiProperty()
  @IsOptional()
  wrap_up_disposition: string

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

