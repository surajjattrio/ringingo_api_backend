import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type PbxLeadStatusDocument = PbxLeadStatusSchema & Document;

@Schema({ collection : "pbx_lead_status" , timestamps : true })

export class PbxLeadStatusSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    pbx_lead_status_uuid: String

    @Prop()
    name : String

    @Prop()
    code : String

    @Prop()
    tenant_uuid : String

    @Prop()
    status : String

    @Prop()
    created_flag : String

}

export const pbxLeadStatusSchema = SchemaFactory.createForClass(PbxLeadStatusSchema);
