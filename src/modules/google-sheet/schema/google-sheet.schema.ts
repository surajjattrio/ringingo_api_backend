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

	@Prop()
	config_uuid: string;

	@Prop()
	spreadsheet_id: string;

	@Prop()
	sheet_gid: number;

	@Prop()
	tab_name: string;

	@Prop()
	row_number: number;

	@Prop()
	crm_lead_id: string;

	@Prop()
	google_sheet_status: string;

	@Prop()
	sheetDate: string;

	@Prop()
	lead_group_uuid: string;

	@Prop()
	tenant_uuid: string;

	@Prop()
	campaign_uuid: string;

	@Prop()
	lead_status: string;

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

// ---------- Single Indexes ----------

GoogleSheetSchema.index({ uuid: 1 }, { unique: true });
GoogleSheetSchema.index({ tenant_uuid: 1 });
GoogleSheetSchema.index({ campaign_uuid: 1 });
GoogleSheetSchema.index({ lead_group_uuid: 1 });
GoogleSheetSchema.index({ phone: 1 });
GoogleSheetSchema.index({ mobileNumber: 1 });
GoogleSheetSchema.index({ status: 1 });
GoogleSheetSchema.index({ lead_status: 1 });
GoogleSheetSchema.index({ orderId: 1 });
GoogleSheetSchema.index({ sheetStatus: 1 });
GoogleSheetSchema.index({ spreadsheetId: 1 });
GoogleSheetSchema.index({ createdAt: -1 });

// ---------- Compound Indexes ----------

// Fast tenant lead listing
GoogleSheetSchema.index({
	tenant_uuid: 1,
	createdAt: -1,
});

// Fast campaign lead lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	campaign_uuid: 1,
});

// Fast campaign reporting
GoogleSheetSchema.index({
	tenant_uuid: 1,
	campaign_uuid: 1,
	createdAt: -1,
});

// Fast lead group lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	lead_group_uuid: 1,
});

// Fast lead status filtering
GoogleSheetSchema.index({
	tenant_uuid: 1,
	lead_status: 1,
});

// Fast processing queue
GoogleSheetSchema.index({
	tenant_uuid: 1,
	status: 1,
});

// Fast processing queue sorting
GoogleSheetSchema.index({
	tenant_uuid: 1,
	status: 1,
	createdAt: -1,
});

// Fast phone lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	phone: 1,
});

// Fast mobile number lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	mobileNumber: 1,
});

// Fast order lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	orderId: 1,
});

// Fast spreadsheet lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	spreadsheetId: 1,
});

// Fast sheet sync status lookup
GoogleSheetSchema.index({
	tenant_uuid: 1,
	sheetStatus: 1,
});

// Fast sync history
GoogleSheetSchema.index({
	tenant_uuid: 1,
	sheetStatus: 1,
	lastSyncedAt: -1,
});

// Fast spreadsheet synchronization monitoring
GoogleSheetSchema.index({
	spreadsheetId: 1,
	sheetName: 1,
	sheetStatus: 1,
});

// Fast reporting and exports
GoogleSheetSchema.index({
	tenant_uuid: 1,
	campaign_uuid: 1,
	lead_status: 1,
});

// Prevent duplicate orders per tenant
GoogleSheetSchema.index(
	{
		tenant_uuid: 1,
		orderId: 1,
	},
	{
		sparse: true,
	}
);