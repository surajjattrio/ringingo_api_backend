// Channel Provider Interface
// This defines the contract that all channel-specific providers must implement

export interface ParsedMessage {
  provider_message_id: string;
  from: string; // sender identifier (phone/IGID/PSID)
  to: string; // recipient identifier
  text_content: string;
  message_type: string; // 'text' | 'image' | 'document' | 'audio' | 'video'
  timestamp: Date;
  channel_identifiers: any; // channel-specific IDs
  raw_payload: any; // original webhook payload
  media:any,
  attachments?: Array<{
    type: string;
    url?: string;
    provider_media_id?: string;
    filename?: string;
  }>;
  direction:string,
  user_uuid:string
}

export interface StatusUpdate {
  provider_message_id: string;
  status: string; // 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date;
  error_code?: string;
  error_message?: string;
}

export interface SendResult {
  success: boolean;
  provider_message_id?: string;
  error?: string;
}

export interface IChannelProvider {
  channelType: "WhatsApp" | "instagram" | "facebook" | "webchat" | "sms";

  // Webhook verification
  verifyWebhook(query: any): { valid: boolean; challenge?: string };

  // Parse incoming webhooks
  parseInboundMessage(payload: any): ParsedMessage[];
  parseStatusUpdate(payload: any): StatusUpdate[];

  // Extract identifiers
  // extractContactIdentifier(payload: any): string;
  extractChannelIdentifiers(payload: any): any;
}