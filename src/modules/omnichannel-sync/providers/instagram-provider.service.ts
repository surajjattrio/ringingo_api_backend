import { Injectable } from "@nestjs/common";
import {
  IChannelProvider,
  ParsedMessage,
  StatusUpdate,
  SendResult,
} from "./channel-provider.interface";
import axios from "axios";

@Injectable()
export class InstagramProviderService implements IChannelProvider {
  channelType = "instagram" as const;

  /**
   * Verify Instagram webhook (same as Facebook webhook verification)
   */
  verifyWebhook(query: any): { valid: boolean; challenge?: string } {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    const VERIFY_TOKEN =
      process.env.INSTAGRAM_VERIFY_TOKEN || "my_instagram_verify_token_123";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return { valid: true, challenge };
    }

    return { valid: false };
  }

  /**
   * Parse Instagram incoming message from webhook
   * Sample webhook structure:
   * {
   *   "object": "instagram",
   *   "entry": [{
   *     "id": "17841476058179506",
   *     "time": 1761847066253,
   *     "messaging": [{
   *       "sender": { "id": "1332239361699779" },
   *       "recipient": { "id": "17841476058179506" },
   *       "timestamp": 1761847065280,
   *       "message": {
   *         "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZA...",
   *         "text": "Test msg"
   *       }
   *     }]
   *   }]
   * }
   */
  parseInboundMessage(payload: any): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    try {
      if (payload.object !== "instagram") {
        return messages;
      }

      const entries = Array.isArray(payload.entry) ? payload.entry : [];
console.log("entriesdsssss of inbound insta msg",entries);

      for (const entry of entries) {
        const instagram_business_account_id = entry.id; // Instagram Business Account ID
        const messagingEvents = Array.isArray(entry.messaging)
          ? entry.messaging
          : [];

        for (const event of messagingEvents) {
          // Only process if it has a message (not delivery receipt, read receipt, etc.)
          if (!event.message) {
            continue;
          }

          if(event?.message?.is_echo){
            return;
          }

          const message = event.message;
          const sender_igid = event.sender?.id || "";
          const recipient_igid = event.recipient?.id || "";
          const timestamp_ms = event.timestamp || Date.now();

          // Parse message content
          const text_content = message.text || "";
          let message_type = "text";
          const attachments = [];

          // Check for attachments (images, videos, etc.)
          if (message.attachments && Array.isArray(message.attachments)) {
            for (const attachment of message.attachments) {
              const att_type = attachment.type || "file"; // 'image', 'video', 'audio', 'file'
              message_type = att_type;

              attachments.push({
                type: att_type,
                url: attachment.payload?.url || "",
                provider_media_id: attachment.payload?.id || "",
              });
            }
          }

          // Check for story reply
          if (message.reply_to) {
            // Story reply detected
            message_type = "story_reply";
          }

          messages.push({
            provider_message_id: message.mid || "",
            from: sender_igid,
            to: recipient_igid,
            text_content,
            message_type,
            timestamp: new Date(timestamp_ms),
            channel_identifiers: {
              instagram_business_account_id,
              // sender_igid,
              // recipient_igid,
            },
            attachments: attachments.length > 0 ? attachments : undefined,
            raw_payload: event,
            media:"",
            direction:"inbound",
            user_uuid:""
          });
        }
      }
    } catch (error) {
      console.error("Error parsing Instagram inbound message:", error);
    }

    return messages;
  }

  /**
   * Parse Instagram status updates (delivery receipts, read receipts)
   * Instagram sends 'delivery' and 'read' events separately
   */
  parseStatusUpdate(payload: any): StatusUpdate[] {
    const updates: StatusUpdate[] = [];

    try {
      if (payload.object !== "instagram") {
        return updates;
      }

      const entries = Array.isArray(payload.entry) ? payload.entry : [];

      for (const entry of entries) {
        const messagingEvents = Array.isArray(entry.messaging)
          ? entry.messaging
          : [];

        for (const event of messagingEvents) {
          const timestamp_ms = event.timestamp || Date.now();

          // Check for delivery receipt
          if (event.delivery) {
            const mids = event.delivery.mids || [];
            for (const mid of mids) {
              updates.push({
                provider_message_id: mid,
                status: "delivered",
                timestamp: new Date(timestamp_ms),
              });
            }
          }

          // Check for read receipt.
          if (event.read) {
            const mid = event.read.mid;
            if (mid) {
              updates.push({
                provider_message_id: mid,
                status: "read",
                timestamp: new Date(timestamp_ms),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing Instagram status update:", error);
    }

    return updates;
  }

  /**
   * Extract contact identifier (IGID) from webhook payload
   */
  // extractContactIdentifier(payload: any): string {
  //   try {
  //     const entry = payload.entry?.[0];
  //     const event = entry?.messaging?.[0];
  //     return event?.sender?.id || "";
  //   } catch (error) {
  //     return "";
  //   }
  // }

  /**
   * Extract channel-specific identifiers from webhook
   */
  extractChannelIdentifiers(payload: any): any {
    try {
      const entry = payload.entry?.[0];
      // const event = entry?.messaging?.[0];

      return {
        instagram_business_account_id: entry?.id || "",
        // sender_igid: event?.sender?.id || "",
        // recipient_igid: event?.recipient?.id || "",
      };
    } catch (error) {
      return {};
    }
  }
}