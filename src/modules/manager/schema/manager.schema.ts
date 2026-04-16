import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { ManagerRoleSchema } from "src/modules/manager-role/schema/manager-role.schema";

export type ManagerDocument = ManagerSchema & Document;

@Schema({ collection: "managers", timestamps: true  , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class ManagerSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    first_name: String;

    @Prop()
    last_name: String;

    @Prop()
    username: String;

    @Prop()
    password: String;

    @Prop()
    status: String;

    @Prop()
    email: String

    @Prop()
    manager_role_uuid: String

    @Prop()
    extension_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    assigned_manager_role : String

    @Prop()
    time_zone_uuid : String

    @Prop()
    parent_uuid : String
}

let managerSchema = SchemaFactory.createForClass(ManagerSchema);
managerSchema.virtual('manager_role' , {
    ref: ManagerRoleSchema.name,
    localField: 'manager_role_uuid',
    foreignField: 'uuid',
})
managerSchema.virtual('extension_details' , {
    ref: ExtensionSchema.name,
    localField: 'extension_uuid',
    foreignField: 'uuid',
})
export { managerSchema }


