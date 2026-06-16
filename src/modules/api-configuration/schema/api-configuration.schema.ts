import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type ApiConfigurationDocument = ApiConfiguration & Document;

@Schema({
  collection: 'api_configurations',
  timestamps: true,
})
export class ApiConfiguration {
  @Prop({
    type: String,
    default: () => randomUUID(),
    required: true,
    unique: true,
    index: true,
  })
  uuid: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  templateId: string;

  @Prop({ type: String, required: true })
  fromEmail: string;

  @Prop({ type: String, default: "https://netcore.onefin.app/api/netcore/email" })
  baseUrl: string;

  @Prop({ type: String })
  attachmentFileName: string;

  @Prop({ type: String })
  attachmentFileUrl: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ type: String, default: '1' })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenant_uuid: string;
}

export const ApiConfigurationSchema = SchemaFactory.createForClass(ApiConfiguration);
