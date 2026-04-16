import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Date, Document } from "mongoose";
import { GreetingSchema } from "src/modules/greeting/schema/greeting.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type ConferenceDocument = ConferenceSchema & Document

@Schema({ collection : "conference" , timestamps : true ,toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class ConferenceSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name : String

    @Prop()
    user_uuid : String

    @Prop()
    status : String

    @Prop()
    greeting_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    pin : String

    @Prop({default : "0"})
    type : String

    @Prop({type : Date , default : ""})
    conference_date ? : Date

    @Prop({default : ""})
    description ? : String

    @Prop({default : ""})
    email_address ? : String

    @Prop({type : Date ,default : ""})
    reminder_before ? : Date

    @Prop({type : Date , default : ""})
    reminder ? : Date

    @Prop({default : 1})
    reminder_sent_status ? : String

    @Prop({default : 1})
    schedule_conf_status ? : String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string
}

let conferenceSchema = SchemaFactory.createForClass(ConferenceSchema);
conferenceSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
conferenceSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
conferenceSchema.virtual('greeting' , {
    ref: GreetingSchema.name,
    localField: 'greeting_uuid',
    foreignField: 'uuid',
})

export { conferenceSchema }
