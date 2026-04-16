import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema} from "src/modules/user/schema/user.schema";


export type GreetingDocument = GreetingSchema & Document;

@Schema({ collection : "greeting" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class GreetingSchema {

    @Prop({type : String})
    uuid : string

    @Prop()
    name : string

    @Prop()
    status : string

    @Prop()
    user_uuid : string

    @Prop()
    tenant_uuid : string

    @Prop()
    manager_uuid: string

    @Prop()
    file : string
}

let greetingSchema = SchemaFactory.createForClass(GreetingSchema);
greetingSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
greetingSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

export { greetingSchema  }
