import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ServerConfigDocument = ServerConfigSchema & Document;

@Schema({
    collection: "server_configurations",
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
})
export class ServerConfigSchema {
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: string;

    @Prop({ type: String, required: true, unique: true, index: true, trim: true })
    server_key: string;

    @Prop({ type: String, required: true, trim: true })
    server_name: string;

    @Prop({ type: String, required: true, trim: true })
    mongo_uri: string;

    @Prop({ type: Boolean, default: true })
    is_active: boolean;

    @Prop({ type: Boolean, default: false })
    is_system: boolean;

    @Prop({ type: String, default: "" })
    description: string;
}

export const serverConfigSchema = SchemaFactory.createForClass(ServerConfigSchema);
