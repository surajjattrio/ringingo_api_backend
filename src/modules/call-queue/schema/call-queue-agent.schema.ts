import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { CallQueueSchema } from "./call-queue.schema";

export type CallQueueAgentDocument = CallQueueAgentSchema & Document;

@Schema({ collection : "call_queue_agent"  , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class CallQueueAgentSchema {

    @Prop()
    call_queue_uuid : String

    @Prop({default : ""})
    name : string

    @Prop({default : "1"})
    status : string

    @Prop({default : ""})
    extension_uuid : string

    @Prop({default : ""})
    level : String

    @Prop({default : ""})
    position : String

    @Prop()
    tenant_uuid : String

    @Prop()
    agent_timeout : String

    @Prop()
    user_uuid : String
}

let callQueueAgentSchema = SchemaFactory.createForClass(CallQueueAgentSchema);
callQueueAgentSchema.virtual('extension' , {
    ref: ExtensionSchema.name,
    localField: 'extension_uuid',
    foreignField: 'uuid',
});
callQueueAgentSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
});
callQueueAgentSchema.virtual('call_queue_details' , {
    ref: CallQueueSchema.name,
    localField: 'call_queue_uuid',
    foreignField: 'uuid',
})

export { callQueueAgentSchema }

