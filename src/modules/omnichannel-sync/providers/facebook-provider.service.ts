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
export class FacebookProviderService {
    channelType = "facebook" as const;

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
     * ✅ Parse inbound facebook messages
     */
    parseInboundMessage(payload: any): ParsedMessage[] {
        const messages: ParsedMessage[] = [];

        console.log("facebooooooooooooook payload", payload);

        try {
            if (payload.object !== "page") {
                // return messages;
                messages.push({
                    provider_message_id: payload?.provider_message_id || "",
                    from: payload?.raw_payload?.sender?.id,
                    to: payload?.raw_payload?.recipient?.id,
                    text_content: payload?.text_content,
                    message_type: payload?.message_type,
                    timestamp: new Date(payload?.timestamp),
                    channel_identifiers: payload?.channel_identifiers,
                    attachments: payload?.raw_payload?.attachments ? payload?.raw_payload?.attachments : undefined,
                    // attachments: payload?.raw_payload?.attachments?.length > 0 ? payload?.raw_payload?.attachments : undefined,
                    raw_payload: payload?.raw_payload,
                    media: "",
                    direction: "inbound",
                    user_uuid: ""
                });
                return messages;

            }

            for (const entry of payload?.entry) {
                const facebook_page_id = entry.id; // Facebook Page ID
                const messagingEvents = Array.isArray(entry.messaging)
                    ? entry.messaging
                    : [];

                for (const event of messagingEvents) {
                    // Only process if it has a message (not delivery receipt, read receipt, etc.)
                    if (!event.message) {
                        continue;
                    }

                    const message = event.message;
                    const sender_fbid = event.sender?.id || "";
                    const recipient_fbid = event.recipient?.id || "";
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
                        from: sender_fbid,
                        to: recipient_fbid,
                        text_content,
                        message_type,
                        timestamp: new Date(timestamp_ms),
                        channel_identifiers: {
                            facebook_page_id,
                            // sender_igid,
                            // recipient_igid,
                        },
                        attachments: attachments.length > 0 ? attachments : undefined,
                        raw_payload: event,
                        media: "",
                        direction: "inbound",
                        user_uuid: ""
                    });
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