import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Document } from 'mongoose';

export type GoogleSheetLeadDocument = GoogleSheetLead & Document;

@Schema({ collection: 'google_sheet_leads', timestamps: true })
export class GoogleSheetLead {
  @Prop({ type: String, default: () => randomUUID(), unique: true })
  uuid: string;

  @Prop() tenant_uuid: string;
  @Prop() campaign_uuid: string;
  @Prop() user_group_uuid: string;
  @Prop() config_uuid: string;
  @Prop() spreadsheet_id: string; // Added field
  @Prop() sheet_gid: number;
  @Prop() tab_name: string;
  @Prop() row_number: number;
  @Prop() crm_lead_id: string; // Replaced lead_management_uuid
  @Prop() google_sheet_status: string; // Added field
  @Prop() token: string; // optional token from sheet row
}

export const GoogleSheetLeadSchema = SchemaFactory.createForClass(GoogleSheetLead);
