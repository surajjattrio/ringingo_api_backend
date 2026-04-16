import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type TenantPersonalizationDocument = TenantPersonalizationSchema & Document;

@Schema( { collection: "tenant_personalization", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class TenantPersonalizationSchema {

     @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
     uuid: String

     @Prop()
     tenant_uuid: string

     @Prop()
     expandedfile: string

     @Prop()
     collapsedfile: string

     @Prop()
     faviconfile: string

     @Prop()
     tenant_domain: string

     @Prop()
     title: string

     @Prop()
     footer: string
}

let tenantpersonalizationSchema = SchemaFactory.createForClass( TenantPersonalizationSchema );
tenantpersonalizationSchema.virtual( 'tenant', {
     ref: TenantSchema.name,
     localField: 'tenant_uuid',
     foreignField: 'tenant_uuid',
} )

export { tenantpersonalizationSchema }

