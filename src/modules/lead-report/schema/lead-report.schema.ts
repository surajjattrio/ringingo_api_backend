import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";


export type LeadreportDocument = LeadreportSchema & Document;

@Schema({ collection : "lead_report" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class LeadreportSchema {

    // @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    // uuid: String

    // @Prop()
    // user_uuid : String

    @Prop()
    disposition_uuid : String

    @Prop()
    lead_group_uuid : String

    @Prop()
    count : number

    @Prop()
    called_count : number
}

let leadreportSchema = SchemaFactory.createForClass(LeadreportSchema);
leadreportSchema.virtual('disposition' , {
    ref: DispositionSchema.name,
    localField: 'disposition_uuid',
    foreignField: 'disposition_uuid',
})
// leadreportSchema.virtual('tenant' , {
//     ref: TenantSchema.name,
//     localField: 'tenant_uuid',
//     foreignField: 'uuid',
// })
// leadreportSchema.virtual('lead_details' , {
//     ref: LeadManagementSchema.name,
//     localField: 'lead_uuid',
//     foreignField: 'lead_management_uuid',
// })
export { leadreportSchema  }
