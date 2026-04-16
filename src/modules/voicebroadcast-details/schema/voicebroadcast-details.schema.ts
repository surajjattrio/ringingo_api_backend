import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { IvrSchema } from "src/modules/ivr/schema/ivr.schema";
import { RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { ApiProperty } from "@nestjs/swagger";
import { VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";

export type VoicebroadcastdetailsDocument = VoicebroadcastdetailsSchema & Document;

@Schema( { collection: "voicebroadcast_details", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class VoicebroadcastdetailsSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    caller_id_number: String

    @Prop()
    voicebroadcast_uuid: String

    @Prop()
    callstart: String

    // @Prop()
    // date: String

    @Prop()
    voice_broadcast_name: String

    @Prop()
    destination_number: String

    @Prop()
    lead: String

    @ApiProperty( { description: "0 - Survey | 1 - IVR " } )
    @Prop()
    type: String

    @Prop()
    total_duration: string

    @Prop()
    billsecond: string

    @Prop()
    ringing_time: string

    @Prop()
    ivr_feedback_score: string

    @Prop()
    survey_info: String
    
    @Prop()
    hangup_cause: String

    // @Prop({default:[] , type : Array})
    // survey_value : Object

}

let voicebroadcastdetailsSchema = SchemaFactory.createForClass( VoicebroadcastdetailsSchema );
voicebroadcastdetailsSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
voicebroadcastdetailsSchema.virtual( 'extension', {
    ref: ExtensionSchema.name,
    localField: 'extension_uuid',
    foreignField: 'uuid',
} )
voicebroadcastdetailsSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
voicebroadcastdetailsSchema.virtual( 'lead_details', {
    ref: LeadManagementSchema.name,
    localField: 'lead_uuid',
    foreignField: 'lead_management_uuid',
} )
voicebroadcastdetailsSchema.virtual( 'voice_broadcast', {
    ref: VoiceBroadcastSchema.name,
    localField: 'voicebroadcast_uuid',
    foreignField: 'uuid',
} )
voicebroadcastdetailsSchema.virtual( 'disposition', {
    ref: DispositionSchema.name,
    localField: 'hangup_cause',
    foreignField: 'disposition_uuid',
} )
export { voicebroadcastdetailsSchema }
