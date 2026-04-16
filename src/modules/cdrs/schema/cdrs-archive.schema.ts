import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Date, Document } from "mongoose";

export type CdrsArchiveDocument = CdrsArchiveSchema & Document;

@Schema( { collection: "cdrs_archive", timestamps: true } )

export class CdrsArchiveSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop()
    collection_name: String

    @Prop()
    collection_name_for_display: String

    @Prop()
    collection_start_date: String

    @Prop()
    collection_end_date: String

    @Prop()
    next_run: String

    @Prop( { type: Boolean, default: 1 } )
    status: Boolean
}

export const cdrsArchiveSchema = SchemaFactory.createForClass( CdrsArchiveSchema );
