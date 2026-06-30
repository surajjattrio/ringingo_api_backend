import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type AgentLiveReportDocument = Document & AgentLiveReportSchema;

@Schema({ collection : "agent_live_report" , timestamps : true })

export class AgentLiveReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    agent_live_report_uuid: String

    @Prop()
    agent_uuid : String

    @Prop()
    agent_name : String

    @Prop({default : ""})
    campaign_uuid : String
   
    @Prop()
    break_name : String

    @Prop()
    break_duration : String
    
    @Prop({default : ""})
    campaign_name : String

    @Prop()
    extension_uuid : String

    @Prop()
    extension_name : String

    @Prop({default : "0"})
    status : String

    @Prop({default : ""})
    phone_number : String

    @Prop({type : String})
    agent_logged_in_time : Date

    @Prop({default : 0})
    total_calls : Number

    @Prop()
    from_last_logged_in : String

    @Prop()
    tenant_uuid : String

    @Prop({default : ""})
    campaign_type : String

    @Prop()
    agent_idle_time:String

    @Prop({default : ""})
    call_start_time : String  // ISO timestamp — when the current call/hold segment started

    @Prop({default : 0})
    call_duration_acc : Number  // accumulated on-call seconds (status 1 or 2) from previous segments

    @Prop({default : 0})
    hold_duration_acc : Number  // accumulated hold seconds (status 7) from previous segments

}

export const agentLiveReportSchema = SchemaFactory.createForClass(AgentLiveReportSchema);
