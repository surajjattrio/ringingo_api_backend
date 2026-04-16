import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type ModechangeDocument = ModechangeSchema & Document

@Schema( {
    collection: "modechange", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class ModechangeSchema {
    @Prop( {
        type: String, default: function radomUUID () { return randomUUID() },
        unique: true
    } )
    uuid: string

    @Prop()
    status: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

}

let modechangeSchema = SchemaFactory.createForClass( ModechangeSchema );
modechangeSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
modechangeSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )

export { modechangeSchema }
