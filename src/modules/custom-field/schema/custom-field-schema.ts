import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type CustomFieldDocument = CustomFieldSchema & Document

@Schema( {
     collection: "custom_fields", timestamps: true
     , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class CustomFieldSchema {


     @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
     uuid: String

     @Prop()
     field_rank: String

     @Prop()
     field_label: String

     @Prop()
     field_name: String

     @Prop()
     field_placeholder: String

     @Prop()
     field_type: String

     @Prop()
     field_options: String

     @Prop()
     lead_group_uuid: String

     @Prop()
     tenant_uuid: String

     @Prop({default:"0"})
     required : String

}

let customfieldschema = SchemaFactory.createForClass( CustomFieldSchema );
customfieldschema.virtual( 'tenant', {
     ref: TenantSchema.name,
     localField: 'tenant_uuid',
     foreignField: 'uuid',
} )
customfieldschema.virtual( 'lead_group', {
     ref: LeadGroupSchema.name,
     localField: 'lead_group_uuid',
     foreignField: 'uuid',
} )
export { customfieldschema }

