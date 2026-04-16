import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type GoogleSheetConfigDocument = GoogleSheetConfig & Document;

@Schema({
	collection: "google_sheet_config",
	timestamps: true,
	toJSON: { virtuals: true, getters: true },
	toObject: { virtuals: true, getters: true }
})
export class GoogleSheetConfig {

	@Prop({
		type: String,
		default: () => randomUUID(),
		unique: true
	})
	uuid: string;

	@Prop()
	user_group_uuid: string

	@Prop()
	tenant_uuid: string

	@Prop()
	campaign_uuid: string

	@Prop()
	lead_status: string
}

export const GoogleSheetConfigSchema = SchemaFactory.createForClass(GoogleSheetConfig);