import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { GreetingSchema } from "src/modules/greeting/schema/greeting.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

let extension_list = [
    {
        "extension_type": "02",
        "extension": "123456",
    }
]

export type RinggroupDocument = RinggroupSchema & Document

@Schema({ collection : "ring_group" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class RinggroupSchema {
    @Prop({type : String , default : function radomUUID(){ return randomUUID() },
    unique : true
    })
    uuid : string

    @Prop({ is_unique: true })
    name:String

    @Prop()
    user_uuid:String

    @Prop()
    type:String

    @Prop()
    status:String

    @Prop()
    timeout:String

    @Prop({default : extension_list , type : Array})
    extension_list : Object

    @Prop()
    tenant_uuid:String

    @Prop()
    greeting_uuid:String

    @Prop()
    sticky_agent : String

    @Prop()
    for_pbx : String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

}

let ringgroupSchema = SchemaFactory.createForClass(RinggroupSchema);
ringgroupSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
ringgroupSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
ringgroupSchema.virtual('greeting' , {
    ref: GreetingSchema.name,
    localField: 'greeting_uuid',
    foreignField: 'uuid',
})

export { ringgroupSchema }
