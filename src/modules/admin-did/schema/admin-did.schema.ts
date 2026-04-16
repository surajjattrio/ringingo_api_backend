import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";


export type AdminDidDocument = AdminDidSchema & Document

@Schema({
    collection: "admin_did", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class AdminDidSchema {

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
    codec: String

    @Prop()
    timeout: String

    @Prop()
    assign_tenant_uuid: String

    @Prop()
    created_flag: String

}

let admindidSchema = SchemaFactory.createForClass(AdminDidSchema);

admindidSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'assign_tenant_uuid',
    foreignField: 'uuid',
})

export { admindidSchema }

