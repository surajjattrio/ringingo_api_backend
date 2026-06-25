import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { GreetingSchema } from "src/modules/greeting/schema/greeting.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type CallQueueDocument = CallQueueSchema & Document;

@Schema({ collection: "call_queue", timestamps: true  , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class CallQueueSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name: String

    @Prop()
    status: String

    @Prop()
    strategy: String
    
    @Prop()
    timeout: String
    
    @Prop({default : "0"})
    agent_timeout: String

    @Prop()
    tenant_uuid: String

    @Prop()
    user_uuid: string

    @Prop()
    call_waiting_greeting_uuid: String

    @Prop()
    call_welcome_greeting_uuid: String

    waiting_greeting?

    @Prop()
    sticky_agent : String

    @Prop()
    for_pbx : String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

    @Prop()
    failover_routing_type: String

    @Prop()
    failover_routing_options: String

    @Prop()
    fail_over_routing_name: String

}

let callQueueSchema = SchemaFactory.createForClass(CallQueueSchema);
callQueueSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
callQueueSchema.virtual('waiting_greeting' , {
    ref: GreetingSchema.name,
    localField: 'call_waiting_greeting_uuid',
    foreignField: 'uuid',
})
callQueueSchema.virtual('welcome_greeting' , {
    ref: GreetingSchema.name,
    localField: 'call_welcome_greeting_uuid',
    foreignField: 'uuid',
})
callQueueSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})

export { callQueueSchema }
