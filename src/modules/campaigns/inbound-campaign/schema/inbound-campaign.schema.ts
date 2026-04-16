import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";
import { CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { WebformSchema } from "src/modules/webform/schema/webform.schema";

export type InboundCampaignDocument = InboundCampaignSchema & Document;

@Schema( { collection: "inbound_campaign", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class InboundCampaignSchema {

  @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
  uuid: String

  @Prop()
  name: String

  @Prop()
  outgoing_rule_uuid: String

  @Prop()
  sticky_agent: String

  @Prop()
  status: String

  @Prop()
  call_id_type: String

  @Prop()
  call_id_value: String

  @Prop()
  description: String

  @Prop( { default: [], type: Array } )
  call_queue_uuid: Object

  @Prop()
  caller_id_time: String

  @Prop( { type: Array } )
  allow_ring_group_transfer: Object

  @Prop( { type: Array } )
  allow_call_queue_transfer: Object

  @Prop( { type: Array } )
  allow_ivr_transfer: Object

  @Prop()
  three_way_caller_id: String

  @Prop()
  recording: String

  @Prop()
  number_masking: String

  @Prop()
  tenant_uuid: String

  @Prop()
  campaign_type: String

  @Prop()
  custom_caller_id: String

  @Prop()
  created_flag: String

  @Prop( { default: [], type: Array } )
  webform_uuid: Object

  @Prop()
  wrap_up_time: String

  @Prop()
  wrap_up_disposition: String

  @Prop()
  auto_answer: String

  @Prop()
  agent_script: String

  @Prop()
  agent_script_text: String


}

let inboundCampaignSchema = SchemaFactory.createForClass( InboundCampaignSchema );
inboundCampaignSchema.virtual( 'outgoing_rule', {
  ref: OutgoingRulesSchema.name,
  localField: 'outgoing_rule_uuid',
  foreignField: 'uuid',
} );
inboundCampaignSchema.virtual( 'call_queue_details', {
  ref: CallQueueSchema.name,
  localField: 'call_queue_uuid',
  foreignField: 'uuid',
} )
inboundCampaignSchema.virtual( "webform", {
  ref: WebformSchema.name,
  localField: "webform_uuid",
  foreignField: "uuid",
} )

export { inboundCampaignSchema }


