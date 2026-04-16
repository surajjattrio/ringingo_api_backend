import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type LeadOriginateDocument = Document & LeadOriginateSchema;

@Schema({ collection : "lead_originate" , timestamps : true })

export class LeadOriginateSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    lead_originate_uuid: String

    @Prop()
    campaign_uuid: String;

    @Prop()
    tenant_uuid: String;

    @Prop({default : ""})
    bridge_uuid : String

    @Prop({default : "0"})
    flag : String

    @Prop()
    lead_management_uuid : String

    @Prop()
    checkdate : String

}

export const leadOriginateSchema = SchemaFactory.createForClass(LeadOriginateSchema);
