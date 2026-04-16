import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";


export type LeadReportDocument = LeadReportSchema & Document;

@Schema({ collection : "lead_report" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class LeadReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    disposition_uuid : String

    @Prop()
    lead_group_uuid : String

    @Prop()
    count : Number

    @Prop()
    called_count : Number
}

let leadReportSchema = SchemaFactory.createForClass(LeadReportSchema);
leadReportSchema.virtual('disposition' , {
    ref: DispositionSchema.name,
    localField: 'disposition_uuid',
    foreignField: 'disposition_uuid',
})
export { leadReportSchema  }

