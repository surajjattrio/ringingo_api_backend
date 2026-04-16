import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { SipProfileSchema } from "src/modules/sip-profile/schema/sip-profile-schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type TrunkDocument = TrunkSchema & Document;

@Schema({ collection : "trunk" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })


export class TrunkSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name: String

    @Prop()
    username: String

    @Prop()
    sip_profile_uuid: String

    @Prop()
    password: String

    @Prop()
    domain: String

    @Prop()
    outbound_proxy: String

    @Prop()
    register: String

    @Prop()
    status: String

    @Prop()
    from_domain? : String

    @Prop()
    from_user? : String

    @Prop()
    realm? : String

    @Prop()
    extension_in_contact? : String

    @Prop()
    extension? : String

    @Prop()
    expire_seconds? : String

    @Prop()
    reg_transport? : String

    @Prop()
    contact_params? : String

    @Prop()
    ping? : String

    @Prop()
    retry_seconds? : String

    @Prop()
    register_proxy? : String

    @Prop()
    dialplan_variable? : String

    @Prop({default:""})
    tenant_uuid? : String[]

    @Prop({default : "0"})
    created_flag? : String

    @Prop( { default: "1" } )
    register_flag?: String
}
let trunkSchema = SchemaFactory.createForClass(TrunkSchema);
trunkSchema.virtual('sip-profile' , {
    ref: SipProfileSchema.name,
    localField: 'sip_profile_uuid',
    foreignField: 'uuid',
})
trunkSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export {trunkSchema}
