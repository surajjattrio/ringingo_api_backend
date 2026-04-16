import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type UserPerformanceReportDocument = UserPerformanceReportSchema & Document;

@Schema({ collection : "user_performance_report" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class UserPerformanceReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    username : String

    @Prop()
    fullname : String

    @Prop()
    user_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    inbound_call_count : String

    @Prop()
    outbound_call_count : String

    @Prop()
    login_hours : String
    
    @Prop()
    total_idle_time : String

    @Prop()
    talk_time : String

    @Prop()
    break_time : String

    @Prop()
    acd : String

    @Prop({default : 0})
    total_acw_time : String

    @Prop( { default: 0 } )
    total_pause_time: String

    @Prop()
    net_login_hours: String 

    @Prop({ default: 0 })
    totalCalls: String

    @Prop({ default: 0 })
    successfulCalls: String

    @Prop({ default: 0 })
    billableSeconds: String

    @Prop({ default: 0 })
    totalInboundCalls: String

    @Prop({ default: 0 })
    totalOutboundCalls: String

    @Prop({ default: 0 })
    answeredCalls: String

    @Prop({ default: 0 })
    totalRingingTime: String

    @Prop({ default: 0 })
    totalHoldTime: String

    @Prop({ default: 0 })
    totalWaitingTime: String

    @Prop({ default: 0 })
    totalDuration: String

    @Prop({ default: 0 })
    avgRingingTime: String

    @Prop({ default: 0 })
    avgHoldTime: String

    @Prop()
    avgWaitingTime: String
    
    @Prop()
    report_date : String
    
    @Prop()
    csat_avg_score : String

    @Prop()
    disconnected_by_agent: String

    @Prop()
    break_details: String
}

let userPerformanceReportSchema = SchemaFactory.createForClass(UserPerformanceReportSchema);

export { userPerformanceReportSchema }

