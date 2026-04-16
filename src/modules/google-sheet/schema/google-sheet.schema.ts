import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type GoogleSheetDocument = GoogleSheet & Document;
export type SheetStatus = 'SYNCED' | 'SYNCING' | 'ERROR';

@Schema({
	collection: "google_sheet",
	timestamps: true,
	toJSON: { virtuals: true, getters: true },
	toObject: { virtuals: true, getters: true }
})
export class GoogleSheet {

	@Prop({
		type: String,
		default: () => randomUUID(),
		unique: true
	})
	uuid: string;

	@Prop({ type: Array, default: () => [] })
	row: any[];

	@Prop()
	sheetDate: string;

	@Prop()
	lead_group_uuid: string

	@Prop()
	tenant_uuid: string

	@Prop()
	campaign_uuid: string

	@Prop()
	lead_status: string

	@Prop()
	name: string;

	@Prop()
	phone: string;

	@Prop({ type: Number })
	amount: number;

	@Prop()
	shopifyCustomerId: string;

	@Prop()
	product1: string;

	@Prop()
	address: string;

	@Prop()
	date: Date;

	@Prop()
	time: string;

	@Prop()
	orderPlaced: string;

	@Prop()
	orderId: string;

	@Prop()
	orderName: string;

	@Prop()
	orderCreatedAt: Date;

	@Prop()
	mobileNumber: string;

	@Prop({ type: Number })
	count: number;

	@Prop()
	callingDate: Date;

	@Prop()
	agentName: string;

	@Prop()
	finalConnected: string;

	@Prop({ type: Number })
	finalSellingPrice: number;

	@Prop({ type: Number })
	finalMOP: number;

	@Prop()
	finalOrderPlaced: string;

	@Prop()
	callingStatus: string;

	@Prop()
	finalRemark: string;

	@Prop()
	extraRemarks: string;

	@Prop()
	orderDate: Date;

	@Prop()
	month: string;

	@Prop({ type: Number })
	churnCount: number;

	@Prop()
	lastCallDate: Date;

	@Prop()
	countType: string;

	@Prop()
	orderedMonth: string;

	@Prop()
	leadsMonth: string;

	@Prop()
	orderStatus: string;

	@Prop({ type: String, index: true, unique: true, sparse: true })
	token: string;

	@Prop({ default: 'pending' })
	status: string;

	@Prop()
	processed_at: Date;

	@Prop({ default: '' })
	note: string;

	// Metadata fields for Google Sheet management
	@Prop()
	spreadsheetId: string;

	@Prop()
	sheetName: string;

	@Prop()
	totalRows: number;

	@Prop({ default: 'SYNCED' })
	sheetStatus: SheetStatus;

	@Prop()
	lastSyncedAt: Date;

	@Prop()
	syncCountToday: number;

	@Prop()
	errorMessage?: string;
}

export const GoogleSheetSchema = SchemaFactory.createForClass(GoogleSheet);