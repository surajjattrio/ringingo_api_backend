import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ManagerRoleDocument = ManagerRoleSchema & Document;

@Schema({collection : "manager_role" , timestamps : true})
export class ManagerRoleSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() } , unique : true})
    uuid : string

    @Prop()
    role_name : String

    @Prop()
    status : String

    @Prop({type : Array})
    module_permission : Object

    @Prop()
    tenant_uuid : String
}

export const managerRoleSchema = SchemaFactory.createForClass(ManagerRoleSchema);