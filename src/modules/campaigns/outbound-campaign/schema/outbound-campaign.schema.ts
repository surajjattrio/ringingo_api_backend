import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";
import { CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { WebformSchema } from "src/modules/webform/schema/webform.schema";

export type OutboundCampaignDocument = OutboundCampaignSchema & Document;

@Schema( { collection: "outbound_campaign", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class OutboundCampaignSchema {

  @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
  uuid: String

  @Prop()
  name: String

  @Prop()
  dial_method: String

  @Prop()
  lead_group_uuid: String

  @Prop()
  outgoing_rule_uuid: String

  @Prop()
  manual_outgoing_rule_uuid: String

  @Prop()
  threeway_outgoing_rule_uuid: String

  @Prop()
  status: String

  @Prop()
  call_id_type: String

  @Prop()
  call_id_value: String

  @Prop()
  description: String

  @Prop()
  concurrent_call: String

  @Prop()
  call_retries: String

  @Prop( { default: "0" } )
  timeout: String

  @Prop()
  greeting_uuid: String

  @Prop()
  recording: String

  @Prop()
  number_masking: String

  @Prop()
  auto_answer: String

  @Prop({ default: "1" })
  is_limechat: String

  @Prop()
  tenant_uuid: String

  @Prop()
  max_retries: String

  @Prop()
  total_leads_count: Number

  @Prop()
  leads_in_queue_count: Number

  @Prop()
  retries_time: String

  @Prop()
  campaign_type: String

  @Prop()
  agent_timeout: String

  @Prop()
  max_dial_level: String

  @Prop()
  caller_id_time: String

  @Prop()
  three_way_caller_id: String

  @Prop( { type: Array } )
  allow_ring_group_transfer: Object

  @Prop( { type: Array } )
  allow_call_queue_transfer: Object

  @Prop( { type: Array } )
  allow_ivr_transfer: Object

  @Prop( { default: [], type: Array } )
  max_retries_disposition: Object

  @Prop()
  target_drop_percentage: String

  @Prop()
  max_predictive_call_count: String

  @Prop()
  answering_machine_detection: String

  @Prop()
  new_dial_level: String

  @Prop()
  custom_caller_id: String

  @Prop( { default: [], type: Array } )
  call_queue_uuid: Object;

  @Prop( { default: [], type: Array } )
  ring_group_uuid: Object

  @Prop()
  cps: Number

  @Prop()
  amd_promptuuid: String

  @Prop()
  lead_type: String

  @Prop()
  created_flag: String

  @Prop( { default: [], type: Array } )
  webform_uuid: Object

  @Prop()
  wrap_up_time: String

  @Prop()
  wrap_up_disposition: String

  @Prop()
  agent_script: String

  @Prop()
  agent_script_text: String


  @Prop()
  email_config_uuid: string;

  @Prop()
  api_config_uuid: string;

  @Prop()
  email_type: string;

  @Prop({
    type: String,
    default: "",
    index: true,
  })
  message_config_uuid: string;

  // Multi Caller IDs for Manual Calls : "0" - Enable | "1" - Disable
  @Prop( { default: "1" } )
  manual_multi_caller_id: String

  // DID numbers agent can choose as caller id while manual dialing
  @Prop( { default: [], type: Array } )
  manual_caller_ids: Object

}

let outboundCampaignSchema = SchemaFactory.createForClass( OutboundCampaignSchema );
outboundCampaignSchema.virtual( 'outgoing_rule', {
  ref: OutgoingRulesSchema.name,
  localField: 'outgoing_rule_uuid',
  foreignField: 'uuid',
} )
outboundCampaignSchema.virtual( "webform", {
  ref: WebformSchema.name,
  localField: "webform_uuid",
  foreignField: "uuid",
} )
outboundCampaignSchema.virtual( "call_queue_details", {
  ref: CallQueueSchema.name,
  localField: "call_queue_uuid",
  foreignField: "uuid",
} );
export { outboundCampaignSchema }


