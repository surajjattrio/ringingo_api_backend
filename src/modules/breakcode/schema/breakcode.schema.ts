import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type BreakcodeDocument = BreakcodeSchema & Document

@Schema({
    collection: "breakcode", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class BreakcodeSchema {
    @Prop({
        type: String, default: function radomUUID() { return randomUUID() },
        unique: true
    })
    uuid: string

    @Prop({ is_unique: true,maxlength: 12 })
    name: String

    @Prop()
    status: String

    @Prop()
    description: String

    @Prop()
    break_code: String

    @Prop()
    duration: String

    // @Prop()
    // user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    billable: String
}

let breakcodeSchema = SchemaFactory.createForClass(BreakcodeSchema);
// breakcodeSchema.virtual('user', {
//     ref: UserSchema.name,
//     localField: 'user_uuid',
//     foreignField: 'uuid',
// })
breakcodeSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export { breakcodeSchema }
