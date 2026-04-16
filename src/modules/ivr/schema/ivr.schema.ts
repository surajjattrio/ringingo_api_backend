import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

let digits = [
    {
    "digits": "1",
    "routing_type": "3",
    "routing_options": "bf18b72f-150f-41a7-add2-a6746d680df8",
    }
]

export type IvrDocument = IvrSchema & Document

@Schema({
    collection: "ivr", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class IvrSchema {
    @Prop({
        type: String, default: function radomUUID() { return randomUUID() },
        unique: true
    })
    uuid: string

    @Prop({ is_unique: true })
    name: String

    @Prop()
    status: String

    @Prop()
    welcome_greetings_uuid: String

    @Prop()
    invalid_greetings_uuid: String

    @Prop()
    invalid_retries: String

    @Prop()
    exit_greetings_uuid: String

    @Prop()
    timeout: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop({default : digits , type : Array})
    digits : Object

    @Prop()
    manager_uuid: string

    @Prop()
    role: string
    
    @Prop()
    is_csat: string

}

let ivrSchema = SchemaFactory.createForClass(IvrSchema);
ivrSchema.virtual('user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
ivrSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export { ivrSchema }
