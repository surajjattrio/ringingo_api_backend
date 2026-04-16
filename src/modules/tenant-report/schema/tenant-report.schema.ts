import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";


export type TenantreportDocument = TenantreportSchema & Document;

@Schema({ collection : "tenant_report" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class TenantreportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    tenant_uuid : String

    @Prop()
    date : String

    @Prop()
    inbound_call_count : String

    @Prop()
    outbound_call_count : String

    @Prop()
    cps_count : String

    @Prop()
    cc_count : String

    @Prop()
    less_six_second_count : String

    @Prop()
    completed_call : String
    
    @Prop()
    sum_of_duration : String

    @Prop()
    acd : String

    @Prop()
    asr : String

    @Prop()
    total_call : String
 
}

let tenantreportSchema = SchemaFactory.createForClass(TenantreportSchema);
tenantreportSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
tenantreportSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
export { tenantreportSchema  }
