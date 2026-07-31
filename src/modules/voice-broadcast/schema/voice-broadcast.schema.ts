import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";

export type VoiceBroadcastDocument = VoiceBroadcastSchema & Document;

@Schema({collection : "voice_broadcast" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export  class VoiceBroadcastSchema {
    
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name : String

    @Prop({ default: [], type: Array })
    lead_group_uuid : any
    
    @Prop()
    caller_id_type : String

    @Prop()
    caller_id : String

    @Prop()
    channel : Number

    @Prop()
    max_retries : String
    
    @Prop({ default: [], type: Array })
    max_retries_disposition_uuid: Object

    @Prop()
    status : String

    @Prop()
    amd : String

    @Prop()
    recording : String

    @Prop()
    start_schedule : Date

    @Prop()
    end_schedule : Date

    @Prop()
    welcome_prompt_uuid : String

    @Prop({default:[] , type : Array})
    welcome_prompt_selected_value : Object

    @Prop()
    exit_prompt_uuid : String

    @Prop()
    broadcast_type : String

    @Prop({default:[] , type : Array})
    survey_value : Object

    @Prop()
    ivr_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop({default : "3"})
    campaign_type : String

    @Prop()
    outgoing_rule_uuid : String

    @Prop({default : "0"}) /* 0 - Idle , 1 - In progress , 2 - running , 3 - stopped */
    broadcast_status : String

    @Prop()
    start_date : String
    
    @Prop()
    end_date : String

    @Prop()
    timeout : String

    @Prop()
    playfile_time : String

    @Prop()
    skip : String

}

let voiceBroadcastSchema = SchemaFactory.createForClass(VoiceBroadcastSchema);
voiceBroadcastSchema.virtual('outgoing_rules' , {
    ref: OutgoingRulesSchema.name,
    localField: 'outgoing_rule_uuid',
    foreignField: 'uuid',
})
export { voiceBroadcastSchema }
