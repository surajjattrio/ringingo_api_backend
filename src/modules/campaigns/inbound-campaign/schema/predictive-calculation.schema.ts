import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type PredictiveCalculationDocument = PredictiveCalculationSchema & Document;

@Schema({ collection : "predictive_calculation" , timestamps : true })

export class PredictiveCalculationSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    inbound_calculation_uuid: String

    @Prop()
    campaign_uuid : String

    @Prop()
    agent_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    flag : String
}

export const predictiveCalculationSchema = SchemaFactory.createForClass(PredictiveCalculationSchema);
