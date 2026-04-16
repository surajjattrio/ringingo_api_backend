import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional } from 'class-validator';
import { randomUUID } from "crypto";
import { Document } from 'mongoose';

export type VoiceDocument = Voice & Document;

@Schema({
    collection: "voice_alert",
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
})
export class Voice {

    @Prop({
        type: String,
        default: () => randomUUID(),
        required: true,
        unique: true,
        index: true
    })
    uuid: string;

    @Prop()
    @IsOptional()
    category: string;

    @Prop({ required: true })
    phone_number: string;

    @Prop({ required: true })
    text: string;

    @Prop()
    tenant_uuid: string;

    @Prop({ default: "" })
    @IsOptional()
    cdrs_uuid: string;

    @Prop()
    user_group_uuid: string;

}

export const VoiceAlertSchema = SchemaFactory.createForClass(Voice);