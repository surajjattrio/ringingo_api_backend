import { Injectable } from "@nestjs/common";
import {
  IChannelProvider,
  ParsedMessage,
  StatusUpdate,
  SendResult,
} from "./channel-provider.interface";
import axios from "axios";
import * as fs from "fs";
import * as path from "path"
@Injectable()
export class WhatsappProviderService {
  channelType = "WhatsApp" as const;

  /**
   * ✅ Webhook Verification
   * (Handled in controller, but required by interface)
   */
  verifyWebhook(query: any): { valid: boolean; challenge?: string } {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    // This value is ignored because actual verification uses DB token,
    // but we return valid so the interface remains consistent.
    if (mode === "subscribe" && token) {
      return { valid: true, challenge };
    }

    return { valid: false };
  }

  /**
   * ✅ Parse inbound WhatsApp messages
   */
  parseInboundMessage(payload: any): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    try {
      if (payload.object !== "whatsapp_business_account") return messages;

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value || value.messaging_product !== "whatsapp") continue;

          const phone_number_id = value.metadata?.phone_number_id;
          const msgList = value.messages ?? [];

          // for (const msg of msgList) {
          //   messages.push({
          //     provider_message_id: msg.id,
          //     from: msg.from,
          //     to: phone_number_id,
          //     text_content: msg.text?.body || "",
          //     message_type: msg.type,
          //     timestamp: new Date(Number(msg.timestamp) * 1000),
          //     channel_identifiers: {
          //       phone_number_id,
          //       // type: value.messaging_product,
          //     },
          //     raw_payload: msg,
          //   });
          // }
          for (const msg of msgList) {
            // Extract text content based on message type
            let textContent =
              msg.text?.body ||
              msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title ||
              msg.image?.caption ||
              msg.document?.filename ||
              "";

            // Build media object if present
            let media: any = undefined;
            if (msg.type === "image" && msg.image?.id) {
              media = {
                kind: "image",
                id: msg.image.id,
                caption: msg.image.caption || "",
                mime_type: msg.image.mime_type,
              };
            } else if (msg.type === "document" && msg.document?.id) {
              media = {
                kind: "document",
                id: msg.document.id,
                filename: msg.document.filename || "",
                mime_type: msg.document.mime_type,
              };
            }
            messages.push({
              provider_message_id: msg.id,
              from: msg.from,
              to: phone_number_id,
              text_content: textContent,
              message_type: msg.type,
              timestamp: new Date(Number(msg.timestamp) * 1000),
              channel_identifiers: {
                phone_number_id,
              },
              media, // Add media field
              raw_payload: msg,
              direction: "inbound",
              user_uuid: ""
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Error parsing WhatsApp inbound:", err);
    }

    return messages;
  }

  /**
   * ✅ Parse delivery/read status updates
   */
  parseStatusUpdate(payload: any): StatusUpdate[] {
    const updates: StatusUpdate[] = [];

    try {
      if (payload.object !== "whatsapp_business_account") return updates;

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const status of change.value?.statuses ?? []) {
            updates.push({
              provider_message_id: status.id,
              status: status.status,
              timestamp: new Date(Number(status.timestamp) * 1000),
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Error parsing WhatsApp status:", err);
    }

    return updates;
  }

  /**
   * ✅ Extract contact identifier (wa_id → user phone)
   */
  // extractContactIdentifier(payload: any): string {
  //   try {
  //     return payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || "";
  //   } catch {
  //     return "";
  //   }
  // }

  /**
   * ✅ Extract channel-specific identifiers (phone_number_id)
   */
  extractChannelIdentifiers(payload: any): any {
    try {
      const value = payload.entry?.[0]?.changes?.[0]?.value;
      return {
        phone_number_id: value?.metadata?.phone_number_id || "",
        from_number: value?.messages?.[0]?.from || "",
      };
    } catch {
      return {};
    }
  }

  async downloadMedia(
    mediaId: string,
    mediaType: "image" | "document",
    token: string,
    mimeType?: string,
    filename?: string
  ): Promise<string | null> {
    try {
      const mediaDir = path.resolve(
        process.cwd(),
        `upload/whatsapp_${mediaType}/receive`
      );

      // Ensure directory exists
      fs.mkdirSync(mediaDir, { recursive: true });

      // Step 1: Get media URL from WhatsApp API
      const mediaMetaRes = await axios.get(
        `https://graph.facebook.com/v20.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const mediaUrl = mediaMetaRes.data?.url;
      if (!mediaUrl) {
        console.error("❌ No media URL returned from WhatsApp");
        return null;
      }

      // Step 2: Download binary
      const mediaRes = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Step 3: Determine file extension
      let fileExt = "bin";
      if (mediaType === "image") {
        fileExt = mimeType?.split("/")[1] || "jpg";
      } else if (mediaType === "document") {
        fileExt = mimeType?.split("/")[1] || filename?.split(".").pop() || "bin";
      }

      // Step 4: Write to local file
      const fileName = `${mediaId}.${fileExt}`;
      const filePath = path.join(mediaDir, fileName);
      fs.writeFileSync(filePath, mediaRes.data);

      // Step 5: Generate public URL
      const publicUrl = path.join(
        process.env.DOCUMENT_IMAGES_URL || "",
        "receive/",
        fileName
      );

      console.log(`✅ ${mediaType} saved: ${filePath}`);
      return publicUrl;
    } catch (error) {
      console.error(`❌ Error downloading ${mediaType}:`, error);
      return null;
    }
  }

}