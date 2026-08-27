import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type MessageConfigurationDocument = MessageConfiguration & Document;

@Schema({
  collection: 'message_configurations',
  timestamps: true,
})
export class MessageConfiguration {
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
  method: string;

  @Prop({ type: String, required: true })
  baseUrl: string;

  @Prop({ type: Array, default: [] })
  headers: any[];

  @Prop({ type: Array, default: [] })
  templates: string[];

  @Prop({ type: String })
  body: string;

  @Prop({ type: String, default: '1' })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenant_uuid: string;
}

export const MessageConfigurationSchema = SchemaFactory.createForClass(MessageConfiguration);
