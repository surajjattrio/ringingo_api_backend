import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";


export type ClickToCallDocument = ClickToCallSchema & Document

@Schema({
    collection: "click_to_call", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class ClickToCallSchema {

    @Prop({
        type: String, default: function radomUUID() { return randomUUID() },
        unique: true
    })
    uuid: string

    @Prop()
    name: String

    @Prop()
    url: String

    @Prop()
    device_number: String

    @Prop()
    status: String

    @Prop()
    category: String

    @Prop()
    tts_script: String

    @Prop()
    tenant_uuid: String

    @Prop()
    clicktocall_forwarding_type: String

    @Prop()
    clicktocall_forwarding_value: String

    @Prop()
    callier_id_number : String

    @Prop()
    user_uuid : String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string


}

let clicktoCallSchema = SchemaFactory.createForClass(ClickToCallSchema);

clicktoCallSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export { clicktoCallSchema }