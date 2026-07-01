import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { BreakcodeSchema, breakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type AgentLoginLogoutDocument = AgentLoginLogoutSchema & Document;

@Schema({ collection : "agent_login_logout_report" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class AgentLoginLogoutSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    agent_login_logout_report_uuid: String

    @Prop()
    login_status : String

    @Prop()
    agent_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    date : String

    @Prop()
    date_time : String

    @Prop()
    converted_date: String

    @Prop()
    breakcode_uuid : string

    @Prop()
    campaign_uuid : string
}
let  agentLoginLogoutSchema = SchemaFactory.createForClass(AgentLoginLogoutSchema);
agentLoginLogoutSchema.virtual( 'breakcode', {
    ref: BreakcodeSchema.name,
    localField: 'breakcode_uuid',
    foreignField: 'uuid',
} )
agentLoginLogoutSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'agent_uuid',
    foreignField: 'uuid',
} )
export { agentLoginLogoutSchema }
