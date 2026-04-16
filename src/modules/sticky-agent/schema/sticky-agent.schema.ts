import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Date, Document } from "mongoose";
import { UserSchema } from "src/modules/user/schema/user.schema";


export type StickyAgentDocument = StickyAgentSchema & Document

@Schema({ collection : "sticky_agent" , timestamps : true ,toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class StickyAgentSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    user_role_uuid : String

    @Prop()
    phone_number : String

    @Prop()
    tenant_uuid : String

    @Prop()
    user_uuid : String

    @Prop()
    sticky_user_role_status: String


}



let stickyAgentSchema = SchemaFactory.createForClass(StickyAgentSchema);
stickyAgentSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
export { stickyAgentSchema }