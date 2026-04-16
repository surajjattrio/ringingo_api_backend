import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type VoicebroadcastdetailsSummaryDocument = VoicebroadcastdetailsSummarySchema & Document;

@Schema({ collection : "Voicebroad_castdetails" , timestamps : true })

export class VoicebroadcastdetailsSummarySchema {

    @Prop()
    date : String

    @Prop()
    direction : String

    @Prop()
    tenant_uuid : String

    @Prop()
    user_uuid : String

    @Prop()
    fail : String

    @Prop()
    success : String

    @Prop()
    total : String

    @Prop()
    billsecond : String
}

export const voicebroadcastdetailsSummarySchema = SchemaFactory.createForClass(VoicebroadcastdetailsSummarySchema);
