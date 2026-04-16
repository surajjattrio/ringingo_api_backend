import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type RolesDocument = RolesSchema & Document;

@Schema({collection : "roles" , timestamps : true})
export class RolesSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() } , unique : true})
    uuid : string

    @Prop()
    role_name : String

    @Prop()
    status : String

    @Prop({type : Object})
    default_permission : Object

    @Prop({type : Object})
    module_permission : Object

    @Prop()
    creation_uuid : String

    @Prop()
    update_uuid : String

}

export const rolesSchema = SchemaFactory.createForClass(RolesSchema);