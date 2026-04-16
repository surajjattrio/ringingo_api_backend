import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CdrsSummaryDocument = CdrsSummarySchema & Document;

@Schema({ collection : "cdrs_summary" , timestamps : true })

export class CdrsSummarySchema {

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

export const cdrsSummarySchema = SchemaFactory.createForClass(CdrsSummarySchema);
