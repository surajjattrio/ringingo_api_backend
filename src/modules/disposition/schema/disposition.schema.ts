import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type DispositionDocument = DispositionSchema & Document;

@Schema({ collection: "disposition", timestamps: true })

export class DispositionSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    disposition_uuid: String

    @Prop()
    name: String

    @Prop()
    code: String

    @Prop()
    tenant_uuid: String

    @Prop()
    status: String

    @Prop()
    created_flag: String

    @Prop()
    human_answer: String

    @Prop()
    sale: String

    @Prop()
    callback: String

    //new
    @Prop()
    parent_disposition: String

    @Prop({ default: false })
    has_children: Boolean

    @Prop({ default: 0 })
    level: Number

    @Prop({ default: () => [] })
    campaign_uuid!: string[];

}

export const dispositionSchema = SchemaFactory.createForClass(DispositionSchema);
