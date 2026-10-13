import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";


export type DidDocument = DidSchema & Document

@Schema({
    collection: "did", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class DidSchema {
    @Prop({
        type: String, default: function radomUUID() { return randomUUID() },
        unique: true
    })
    uuid: string

    @Prop({ unique: true })
    number: String

    @Prop()
    status: String

    @Prop()
    user_uuid: String

    @Prop()
    codec: String

    @Prop()
    timeout: String

    @Prop()
    tenant_uuid: String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

    @Prop()
    did_forwarding_type: String

    @Prop()
    did_forwarding_value: String

    @Prop()
    did_as_cid : String

    // Display name of DID, shown to agent while selecting caller id for manual calls
    @Prop({ default: "" })
    name : String

}

let didSchema = SchemaFactory.createForClass(DidSchema);
didSchema.virtual('user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
didSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export { didSchema }
