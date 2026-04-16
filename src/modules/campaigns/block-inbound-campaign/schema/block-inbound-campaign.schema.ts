import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";


export type BlockInboundCampaignDocument =  BlockInboundCampaignSchema & Document;

@Schema({ collection: "block_inbound_campaign", timestamps: true})


export class BlockInboundCampaignSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name : String

    @Prop()
    status : String

    @Prop()
    type : String

    @Prop()
    type_value : String

    @Prop()
    tenant_uuid : String

    @Prop()
    user_uuid : String
}

export const blockInboundCampaignSchema = SchemaFactory.createForClass(BlockInboundCampaignSchema);
