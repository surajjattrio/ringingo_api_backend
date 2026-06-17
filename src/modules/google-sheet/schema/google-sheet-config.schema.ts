import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type GoogleSheetConfigDocument = GoogleSheetConfig & Document;

/* -------------------------------------------------------------------------- */
/*                               Nested Schemas                               */
/* -------------------------------------------------------------------------- */

@Schema({ _id: false })
export class FieldMapping {

	@Prop({ required: true })
	index: number;

	@Prop({ required: true })
	field: string;

	@Prop({
		default: "string",
		enum: ["string", "number", "date", "phone"]
	})
	type: string;
}

export const FieldMappingSchema = SchemaFactory.createForClass(FieldMapping);

@Schema({ _id: false })
export class NotificationRecipient {

	@Prop({ required: true })
	name: string;

	@Prop({ required: true })
	email: string;
}

export const NotificationRecipientSchema = SchemaFactory.createForClass(NotificationRecipient);

/* -------------------------------------------------------------------------- */
/*                              Main Schema                                   */
/* -------------------------------------------------------------------------- */

@Schema({
	collection: "google_sheet_config",
	timestamps: true,
	toJSON: { virtuals: true, getters: true },
	toObject: { virtuals: true, getters: true }
})

export class GoogleSheetConfig {

	/* ---------------------------------------------------------------------- */
	/*                               Identity                                 */
	/* ---------------------------------------------------------------------- */

	@Prop({ type: String, default: () => randomUUID(), unique: true, index: true })
	uuid: string;

	@Prop({ required: true, index: true })
	tenant_uuid: string;

	/**
	 * References GoogleCredential.uuid
	 */
	@Prop({ required: true, index: true })
	credential_uuid: string;

	/* ---------------------------------------------------------------------- */
	/*                           Campaign Config                              */
	/* ---------------------------------------------------------------------- */

	@Prop({ required: true, index: true })
	user_group_uuid: string;

	@Prop({ index: true, default: null })
	campaign_uuid?: string;

	@Prop({ required: true })
	lead_status: string;

	@Prop({ default: "blended", enum: ["blended", "outbound"] })
	campaign_flag: string;

	/* ---------------------------------------------------------------------- */
	/*                            Google Sheet Info                           */
	/* ---------------------------------------------------------------------- */

	/**
	 * Spreadsheet ID from Google Sheet URL
	 */
	@Prop({ required: true, index: true })
	sheet_id: string;

	/**
	 * Example: A2:AJ
	 */
	@Prop({ required: true })
	range_without_tab: string;

	/* ---------------------------------------------------------------------- */
	/*                           Column Indexes                               */
	/* ---------------------------------------------------------------------- */

	@Prop({ default: 7 })
	date_column_index: number;

	@Prop({ default: 9 })
	order_placed_column_index: number;

	@Prop({ default: 12 })
	order_created_at_column_index: number;

	@Prop({ default: 2 })
	token_column_index: number;

	/* ---------------------------------------------------------------------- */
	/*                           Dynamic Mapping                              */
	/* ---------------------------------------------------------------------- */

	@Prop({
		type: [FieldMappingSchema],
		default: [],
		validate: {
			validator: (val: any) => {
				if (!val) return true;
				if (Array.isArray(val)) {
					return val.every(item => item && typeof item.index === 'number' && typeof item.field === 'string');
				}
				return false;
			},
			message: "field_mappings must be a valid array of FieldMapping"
		},
		set: (val: any) => {
			if (!val) return [];
			if (typeof val === 'string') {
				try {
					const parsed = JSON.parse(val);
					return Array.isArray(parsed) ? parsed : [];
				} catch {
					return [];
				}
			}
			if (typeof val === 'object' && !Array.isArray(val)) {
				if (typeof val.index !== 'undefined' && typeof val.field !== 'undefined') {
					return [val];
				}
				return Object.values(val);
			}
			return Array.isArray(val) ? val : [];
		}
	})
	field_mappings: FieldMapping[];

	/* ---------------------------------------------------------------------- */
	/*                            Runtime State                               */
	/* ---------------------------------------------------------------------- */

	/**
	 * Current active tab gid
	 */
	@Prop({ default: null })
	active_tab_gid: number | null;

	/**
	 * True when all tabs exhausted
	 */
	@Prop({ default: false, index: true })
	all_tabs_exhausted: boolean;

	/**
	 * Exhaustion notification timestamp
	 */
	@Prop({ type: String, default: null })
	exhaustion_email_sent_at: string | null;

	/* ---------------------------------------------------------------------- */
	/*                       Notification Recipients                          */
	/* ---------------------------------------------------------------------- */

	@Prop({ type: [NotificationRecipientSchema], default: [] })
	notification_recipients: NotificationRecipient[];

	/* ---------------------------------------------------------------------- */
	/*                             Flags                                      */
	/* ---------------------------------------------------------------------- */

	@Prop({ default: true })
	filter_today: boolean;

	@Prop({ default: true, index: true })
	isActive: boolean;

	/* ---------------------------------------------------------------------- */
	/*                          HTTP Config                                   */
	/* ---------------------------------------------------------------------- */

	@Prop({ default: 30000 })
	timeout_ms: number;

	@Prop({ default: 3 })
	max_retries: number;
}

/* -------------------------------------------------------------------------- */
/*                              Schema Factory                                */
/* -------------------------------------------------------------------------- */

export const GoogleSheetConfigSchema = SchemaFactory.createForClass(GoogleSheetConfig);

// ---------- Single Indexes ----------

GoogleSheetConfigSchema.index({ uuid: 1 }, { unique: true });
GoogleSheetConfigSchema.index({ tenant_uuid: 1 });
GoogleSheetConfigSchema.index({ campaign_uuid: 1 });
GoogleSheetConfigSchema.index({ user_group_uuid: 1 });
GoogleSheetConfigSchema.index({ lead_status: 1 });
GoogleSheetConfigSchema.index({ createdAt: -1 });

// ---------- Compound Indexes ----------

// Fast campaign lookup within tenant
GoogleSheetConfigSchema.index({
	tenant_uuid: 1,
	campaign_uuid: 1,
});

// Fast user group lookup within tenant
GoogleSheetConfigSchema.index({
	tenant_uuid: 1,
	user_group_uuid: 1,
});

// Fast lead status lookup within tenant
GoogleSheetConfigSchema.index({
	tenant_uuid: 1,
	lead_status: 1,
});

// Fast tenant configuration listing
GoogleSheetConfigSchema.index({
	tenant_uuid: 1,
	createdAt: -1,
});

// Fast campaign + lead status filtering
GoogleSheetConfigSchema.index({
	tenant_uuid: 1,
	campaign_uuid: 1,
	lead_status: 1,
});

// Prevent duplicate configuration
GoogleSheetConfigSchema.index(
	{
		tenant_uuid: 1,
		campaign_uuid: 1,
		user_group_uuid: 1,
		lead_status: 1,
	},
	{
		unique: true,
	}
);