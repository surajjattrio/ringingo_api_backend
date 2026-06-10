import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoogleSheetTabDocument = GoogleSheetTab & Document;

@Schema({ timestamps: true, collection: 'google_sheet_tabs' })

export class GoogleSheetTab {

    /** References GoogleSheetConfig.uuid */
    @Prop({ required: true, index: true })
    config_uuid: string;

    @Prop({ required: true })
    tenant_uuid: string;

    /** Google's internal numeric sheet ID from the Sheets API (sheetId) */
    @Prop({ required: true })
    sheet_gid: number;

    /**
     * The tab title exactly as it appears in the spreadsheet.
     * Used as the LeadGroup name — zero manual mapping required.
     */
    @Prop({ required: true })
    tab_name: string;

    /**
     * Left-to-right position of this tab (0 = leftmost visible tab).
     * Re-synced every cron run so newly inserted tabs are handled correctly.
     */
    @Prop({ required: true })
    position: number;

    @Prop({
        default: 'pending',
        enum: ['pending', 'active', 'exhausted']
    })
    status: string;

    /** UUID of the LeadGroup created for this tab */
    @Prop({ default: null })
    lead_group_uuid: string | null;

    /** Total leads successfully imported for this tab (cumulative) */
    @Prop({ default: 0 })
    total_leads: number;

    /** Total rows fetched from the sheet for this tab */
    @Prop({ default: 0 })
    totalRows: number;

    /** Callable leads remaining as of the last exhaustion check */
    @Prop({ default: 0 })
    remaining_leads: number;

    /** When this tab was promoted to active */
    @Prop({ default: null })
    activated_at: Date | null;

    /** When exhaustion was confirmed */
    @Prop({ default: null })
    exhausted_at: Date | null;
}

export const GoogleSheetTabSchema = SchemaFactory.createForClass(GoogleSheetTab);

// One document per tab per config
GoogleSheetTabSchema.index({ config_uuid: 1, sheet_gid: 1 }, { unique: true });