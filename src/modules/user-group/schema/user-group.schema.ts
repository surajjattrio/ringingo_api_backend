import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
//import { UserSchema } from "src/modules/user/schema/user.schema";
import { OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";

export type UserGroupDocument = UserGroupSchema & Document;

@Schema({ collection: "user_group", timestamps: true  , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class UserGroupSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String
    
    @Prop()
    name : String

    @Prop()
    outbound_rule : String

    @Prop({default : "0"})
    status : String

    /*@Prop()
    user_uuid : String[]*/

    @Prop({default:""})
    tenant_uuid? : String

    @Prop()
    manager_uuid : String

    @Prop()
    role : String

}

let userGroupSchema = SchemaFactory.createForClass(UserGroupSchema)
userGroupSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
/*userGroupSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})*/
userGroupSchema.virtual('outbound_rule_detail' , {
    ref: OutgoingRulesSchema.name,
    localField: 'outbound_rule',
    foreignField: 'uuid',
})

export { userGroupSchema }  
