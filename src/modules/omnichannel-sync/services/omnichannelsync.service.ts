import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import {
  OmnichannelsyncDocument,
  OmnichannelsyncSchema,
} from "../schema/omnichannelsync.schema";
import {
  OmnichannelmessageDocument,
  OmnichannelmessageSchema,
} from "../../omnichannel-message/schema/omnichannelmessage.schema";
import {
  MessagingChannelDocument,
  MessagingChannelSchema,
} from "../../messaging-channel/schema/messaging-channel.schema";
import { SocketService } from "../../websockets/websockets.gateway";
import { InstagramProviderService } from "../providers/instagram-provider.service";
import { IChannelProvider } from "../providers/channel-provider.interface";
import { WhatsappProviderService } from "../providers/whatsapp-provider.service";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { MessagingQueueDocument, MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";
import { AgentDocument, AgentSchema } from "src/modules/agent/schema/agent.schema";
import { FacebookProviderService } from "../providers/facebook-provider.service";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class OmnichannelsyncService {
  private providers: Map<string, IChannelProvider> = new Map();

  constructor(
    @InjectModel(OmnichannelsyncSchema.name)
    private readonly omnichannel_sync: Model<OmnichannelsyncDocument>,
    @InjectModel(OmnichannelmessageSchema.name)
    private readonly omnichannel_message: Model<OmnichannelmessageDocument>,
    @InjectModel(MessagingChannelSchema.name)
    private readonly messaging_channel: Model<MessagingChannelDocument>,
    private readonly instagramProvider: InstagramProviderService,
    private readonly whatsappProvider: WhatsappProviderService,
    private readonly facebookProvider: FacebookProviderService,
    private readonly socketService: SocketService,
    private readonly commonDbFn: CommonDBFunctions,
    @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
    @InjectModel(MessagingQueueSchema.name) private readonly messaging_queue: Model<MessagingQueueDocument>,
    @InjectModel(AgentSchema.name) private readonly user: Model<AgentDocument>,
    @InjectModel(OmnichannelmessageSchema.name) private readonly Omnichannelmessage: Model<OmnichannelmessageDocument>,
  ) {
    // Register channel providers
    this.providers.set("instagram", this.instagramProvider);
    // Future: this.providers.set('facebook', this.facebookProvider);
    this.providers.set('WhatsApp', this.whatsappProvider);
    this.providers.set('facebook', this.facebookProvider);
  }

  /**
   * Main webhook handler for all channels
   * Routes to appropriate channel provider based on channel type
   */
  async handleWebhook(channelType: string, payload: any) {
    try {
      const provider = this.providers.get(channelType);
      if (!provider) {
        throw new Error(`Unknown channel type: ${channelType}`);
      }

      // Parse inbound messages
      const messages = provider.parseInboundMessage(payload);

      for (const parsed of messages) {
        await this.processInboundMessage(channelType, parsed);
      }

      // Parse status updates (delivered, read, etc.)
      const statusUpdates = provider.parseStatusUpdate(payload);

      for (const update of statusUpdates) {
        await this.processStatusUpdate(update);
      }

      return { ok: true };
    } catch (error) {
      console.error("Webhook processing error:", error);
      return { ok: false, error: (error as Error).message };
    }
  }


  private async saveInboundMedia(
    fileUrl: string,
    mimeType?: string
  ): Promise<{ publicUrl: string; ext: string } | null> {
    try {
      const response = await axios.get(fileUrl, { responseType: "stream" });

      const finalMime = mimeType || response.headers["content-type"];

      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
        "video/mp4": "mp4",
        "audio/ogg": "ogg",
      };

      const ext = mimeToExt[finalMime as string] || "bin";

      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const dirPath = path.join(
        process.cwd(),
        "upload",
        "whatsapp_image",
        "receive"
      );

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, filename);

      await new Promise<void>((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        response.data.pipe(stream);
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      fs.chmodSync(filePath, 0o644);

      const publicUrl = `${process.env.DOCUMENT_IMAGES_URL}/receive/${filename}`;

      return { publicUrl, ext };
    } catch (err: any) {
      console.error("❌ Media save failed:", err.message);
      return null;
    }
  }

  /**
   * Process inbound message from any channel
   * 1. Find channel configuration
   * 2. Save message to omnichannelmessage
   * 3. Check if conversation is already assigned
   * 4. Route via WebSocket (assigned agent or available agents)
   */

  private async processInboundMessage(channelType: string, parsed: any) {
    try {
      console.log(`📨 Processing inbound ${channelType}`, parsed.provider_message_id);

      const channel = await this.findChannelByIdentifiers(
        channelType,
        parsed.channel_identifiers
      );
      if (!channel) return;

      const imageUrls: string[] = [];
      const documentUrls: string[] = [];
      const attachments: any[] = [];

      // ==========================
      // WHATSAPP
      // ==========================
      if (channelType === "WhatsApp" && parsed.media?.url) {
        const { url, kind, mime_type } = parsed.media;

        const saved = await this.saveInboundMedia(url, mime_type);
        if (!saved) return;

        const { publicUrl, ext } = saved;

        if (kind === "image") {
          imageUrls.push(publicUrl);
          attachments.push({ type: "image", url: publicUrl });
        }

        if (kind === "document") {
          documentUrls.push(publicUrl);
          attachments.push({ type: "document", url: publicUrl });
        }
      }

      // ==========================
      // INSTAGRAM & FACEBOOK
      // ==========================
      if (
        (channelType === "instagram" || channelType === "facebook") &&
        Array.isArray(parsed.attachments)
      ) {
        for (const att of parsed.attachments) {
          const mediaUrl = att?.url;
          if (!mediaUrl) continue;

          // ⛔ DO NOT get ext from URL
          const saved = await this.saveInboundMedia(mediaUrl);
          if (!saved) continue;

          const { publicUrl, ext } = saved;

          if (att.type === "image") {
            imageUrls.push(publicUrl);
            attachments.push({ type: "image", url: publicUrl });
          }

          if (att.type === "file" && ext === "pdf") {
            documentUrls.push(publicUrl);
            attachments.push({ type: "document", url: publicUrl });
          }
        }
      }

      // ==========================
      // MESSAGE DOC
      // ==========================
      const messageDoc = {
        // Channel info
        channel_type: channelType,
        channel_uuid: channel.uuid,
        messaging_channel_uuid: channel.uuid, // backward compatibility

        // Provider message ID (for idempotency)
        provider_message_id: parsed.provider_message_id,

        // Channel identifiers
        channel_identifiers: parsed.channel_identifiers,

        // Participants
        from_number: parsed.from, // IGID for Instagram
        // to: parsed.to,
        to: channel.customFields.from_number || parsed?.to,

        // Content
        direction: "inbound",
        text_content: parsed.text_content,
        text_type: parsed.message_type,
        message_type: "1", // "1" = received (backward compatibility)

        // Attachments
        attachments: parsed.attachments,

        // Status
        status: "received",
        notification_type: "0", // received

        // Metadata  
        timestamp: parsed.timestamp,
        raw_payload: parsed.raw_payload,

        // Tenant
        tenant_uuid: channel.tenant_uuid,

        // Unread flag
        is_unread: true,
        unread_message: "1", // backward compatibility

        // User (agent) - will be set when accepted
        user_uuid: "",

        // Media URLs 
        image_url: imageUrls,
        document_url: documentUrls,
      };

      // ==========================
      // IDEMPOTENT SAVE
      // ==========================
      const result = await this.omnichannel_message.updateOne(
        { provider_message_id: parsed.provider_message_id },
        { $setOnInsert: messageDoc },
        { upsert: true }
      );

      if (result.upsertedCount === 0) return;

      // ==========================
      // SOCKET ROUTING (UNCHANGED)
      // ==========================

      // Step 4: Check if conversation is already assigned to an agent
      const session = await this.omnichannel_sync
        .findOne({
          channel_type: channelType,
          from_number: parsed.from,
          status: "active",
        })
        .lean();

      const isAssigned =
        !!session &&
        session.user_uuid &&
        String(session.user_uuid).trim() !== "";

      console.log(`🔍 Conversation assigned: ${isAssigned}`);

      // Step 5: Route via WebSocket
      const notificationPayload = {
        event: isAssigned
          ? "omnichannel_new_message"
          : "omnichannel_new_conversation",
        channelType,
        phone_number_id: parsed?.channel_identifiers?.phone_number_id,
        channelUuid: channel.uuid,
        from_number: parsed.from,
        to: parsed.to,
        messageBody: parsed.text_content,
        messageId: parsed.provider_message_id,
        timestamp: parsed.timestamp,
        channelIdentifiers: parsed.channel_identifiers,
        ...(imageUrls && { image_url: imageUrls }),
        ...(documentUrls && { document_url: documentUrls })
      };
      let assigned_user_uuid: any = "";
      if (isAssigned) {
        // ✅ Assigned → send directly to the agent
        assigned_user_uuid = session.user_uuid;
        console.log(`📤 Routing to assigned agent: ${session.user_uuid}`);

        // Use your existing socketService emit method
        // Adjust this based on your actual SocketService API
        this.socketService.emitToUser(
          assigned_user_uuid,
          notificationPayload
        );
        await this.omnichannel_message.updateOne(
          { provider_message_id: parsed.provider_message_id },
          { $set: { user_uuid: assigned_user_uuid } }
        );
      } else {
        // ❌ Unassigned → notify all available agents for this channel
        console.log(`📢 Broadcasting to available agents for ${channelType}`);

        // PopUp Restriction Logic:

        console.log("chaneeelellll", channel);

        // ==========================
        // FIND USERS ALLOWED FOR CHANNEL
        // ==========================
        const eligibleUsers = await this.user.find({
          tenant_uuid: channel.tenant_uuid,

          // 🔑 Match array-of-objects correctly
          "omni_messaging_channel_uuid.value": channel.uuid,
        })
          .select("uuid omni_messaging_channel_uuid")
          .lean();

        const userUuids: any = eligibleUsers.map(u => u.uuid);

        this.socketService.emitOmnichannelMessage(
          notificationPayload,
          userUuids
        );

        // Broadcast to all connected clients
        // Adjust this based on your actual SocketService API
        // this.socketService.emitOmnichannelMessage(notificationPayload);
        // this.socketService.server.emit(
        //   `channel:${channelType}:new_conversation`,
        //   notificationPayload
        // );
      }

      console.log(`✅ Message processing complete`);
    } catch (error) {
      console.error("Error processing inbound message:", error);
    }
  }


  /**
   * Process status updates (delivered, read, etc.)
   */
  private async processStatusUpdate(update: any) {
    try {
      console.log(
        `📊 Processing status update: ${update.provider_message_id} → ${update.status}`
      );

      await this.omnichannel_message.updateOne(
        { provider_message_id: update.provider_message_id },
        {
          $set: {
            status: update.status,
            status_updated_at: update.timestamp,
            notification_type:
              update.status === "delivered"
                ? "1"
                : update.status === "read"
                  ? "2"
                  : "0",
          },
        }
      );

      console.log(`✅ Status updated`);
    } catch (error) {
      console.error("Error processing status update:", error);
    }
  }

  /**
   * Find messaging channel by channel-specific identifiers
   */
  private async findChannelByIdentifiers(
    channelType: string,
    identifiers: any
  ): Promise<any> {
    let query: any = { type: channelType };

    if (channelType === "instagram") {
      // Match by Instagram Business Account ID
      query["customFields.instagram_business_account_id"] =
        identifiers.instagram_business_account_id;
    } else if (channelType === "WhatsApp") {
      // Match by phone_number_id
      query["customFields.phone_number_id"] = identifiers.phone_number_id;
    } else {
      // Match by facebook_page_id
      query["customFields.facebook_page_id"] = identifiers.facebook_page_id;
    }

    return this.messaging_channel.findOne(query).lean();
  }
  //   private async findChannelByIdentifiers(channelType: string, identifiers: any): Promise<any> {
  //     console.log('🔍 Looking for channel:', channelType, JSON.stringify(identifiers, null, 2));

  //     // Get all channels of this type
  //     const channels = await this.messaging_channel.find({
  //         type: new RegExp(`^${channelType}$`, 'i')  // Case insensitive
  //     }).lean();

  //     console.log(`📋 Found ${channels.length} ${channelType} channel(s)`);

  //     // Filter in JavaScript instead of MongoDB nested query
  //     let result = null;

  //     if (channelType === 'instagram') {
  //         result = channels.find(ch =>
  //             ch.customFields?.business_account_id === identifiers.instagram_business_account_id
  //         );

  //         if (!result) {
  //             console.log('❌ No match found. Available Instagram channels:');
  //             channels.forEach(ch => {
  //                 console.log(`   - ${ch.name}: business_account_id = ${ch.customFields?.business_account_id}`);
  //             });
  //         }
  //     } else if (channelType === 'whatsapp') {
  //         result = channels.find(ch =>
  //             ch.customFields?.phone_number_id === identifiers.phone_number_id
  //         );
  //     } else if (channelType === 'facebook') {
  //         result = channels.find(ch =>
  //             ch.customFields?.page_id === identifiers.page_id
  //         );
  //     }

  //     if (result) {
  //         console.log('✅ Channel found:', result.name, `(${result.uuid})`);
  //     } else {
  //         console.log('❌ No matching channel found');
  //     }

  //     return result;
  // }


  async findChannel(type: string): Promise<any> {
    return this.messaging_channel.findOne({ type: type }).lean();
  }

  private normalizeDialiqoUrl(input: string): string {
    if (!input) return '';

    let url = String(input).trim();
    url = url.replace(/^\.\\+/, '').replace(/^\.\/+/, '');
    url = url.replace(/\\/g, '/');
    url = url.replace(/^https:\/*/, 'https://');
    url = url.replace(/^http:\/*/, 'http://');

    return url;
  }


  async unreadsection(queryParams) {
    const { campaign_uuid, uuid: user_uuid, tenant_uuid } = queryParams;

    if (!campaign_uuid) {
      return this.commonDbFn.sendResponseWithMessage(
        HttpStatus.BAD_REQUEST,
        "campaign_uuid is required"
      );
    }

    // Fetch allowed queues
    const blendedCampaign = await this.getBlendedCampaign(campaign_uuid);
    if (!blendedCampaign) {
      return this.commonDbFn.sendResponseWithMessage(
        HttpStatus.NOT_FOUND,
        "Campaign not found"
      );
    }

    const allowedQueueUUIDs = this.getAllowedQueueUUIDs(blendedCampaign);

    // UNREAD MESSAGES
    const unread = await this.getUnreadMessages(allowedQueueUUIDs, tenant_uuid);

    // ACTIVE MESSAGES
    const active = await this.getActiveMessages(
      allowedQueueUUIDs,
      tenant_uuid,
      user_uuid
    );

    const response = {
      ...(unread.length ? { unread } : {}),
      ...(active.length ? { active } : {}),
    };

    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, response);
  }

  private async getBlendedCampaign(campaign_uuid: string) {
    const result = await this.blended_campaign.findOne({ uuid: campaign_uuid }).exec();
    return result || null;
  }

  private getAllowedQueueUUIDs(campaign: any): string[] {
    if (!Array.isArray(campaign.allowed_messaging_queue)) return [];
    return campaign.allowed_messaging_queue.map((q: any) => q.uuid);
  }

  private async getMessagingQueues(tenant_uuid: string, allowedQueueUUIDs: string[]) {
    return await this.messaging_queue.find({
      tenant_uuid,
      type: "0",
      uuid: { $in: allowedQueueUUIDs },
    }).exec();
  }

  private extractChannelIdentifiers(messagingChannels: any[]) {
    const phoneNumbers: string[] = [];
    const instagramIds: string[] = [];
    const facebookIds: string[] = [];

    for (const channel of messagingChannels) {
      const { phone_number_id, instagram_business_account_id, facebook_page_id } = channel.customFields || {};

      if (phone_number_id) phoneNumbers.push(phone_number_id);
      if (instagram_business_account_id) instagramIds.push(instagram_business_account_id);
      if (facebook_page_id) facebookIds.push(facebook_page_id);
    }

    return { phoneNumbers, instagramIds, facebookIds };
  }

  private async getUnifiedMessagingChannels(tenant_uuid: string, queue: any) {

    if (!queue?.messaging_queue_channel?.WhatsApp) return [];

    const whatsappChannels = queue.messaging_queue_channel.WhatsApp;

    return await this.messaging_channel.find({
      tenant_uuid,
      uuid: { $in: whatsappChannels },
      $or: [{ type: "WhatsApp" }, { type: "instagram" }, { type: "facebook" }],
    }).exec();
  }

  private async getUnreadMessages(allowedQueueUUIDs: string[], tenant_uuid: string) {
    const queues = await this.getMessagingQueues(tenant_uuid, allowedQueueUUIDs);

    let results: any[] = [];

    for (const queue of queues) {
      const messagingChannels = await this.getUnifiedMessagingChannels(tenant_uuid, queue);
      if (!messagingChannels.length) continue;

      const { phoneNumbers, instagramIds, facebookIds } = this.extractChannelIdentifiers(messagingChannels);

      const unread = await this.Omnichannelmessage.aggregate([
        {
          $match: {
            user_uuid: "",
            $or: [
              { "channel_identifiers.phone_number_id": { $in: phoneNumbers } },
              { "channel_identifiers.instagram_business_account_id": { $in: instagramIds } },
              { "channel_identifiers.facebook_page_id": { $in: facebookIds } },
            ],
          },
        },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$from_number",
            latest_message: { $first: "$$ROOT" },
          },
        },
        { $sort: { "latest_message.timestamp": -1 } },
      ]).exec();

      if (unread.length) results = results.concat(unread);
    }

    return results;
  }

  private async getActiveMessages(
    allowedQueueUUIDs: string[],
    tenant_uuid: string,
    user_uuid: string
  ) {
    const queues = await this.getMessagingQueues(tenant_uuid, allowedQueueUUIDs);

    let results: any[] = [];

    for (const queue of queues) {
      const messagingChannels = await this.getUnifiedMessagingChannels(tenant_uuid, queue);
      if (!messagingChannels.length) continue;

      const { phoneNumbers, instagramIds, facebookIds } = this.extractChannelIdentifiers(messagingChannels);

      const active = await this.Omnichannelmessage.aggregate([
        {
          $match: {
            user_uuid,
            $or: [
              { "channel_identifiers.phone_number_id": { $in: phoneNumbers } },
              { "channel_identifiers.instagram_business_account_id": { $in: instagramIds } },
              { "channel_identifiers.facebook_page_id": { $in: facebookIds } },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              lead_management_uuid: "$lead_management_uuid",
              contact: {
                $cond: [
                  { $eq: ["$message_type", "0"] },
                  "$to",
                  "$from_number"
                ],
              },
            },
            latest_message: { $first: "$$ROOT" },
            unread_message_count: { $sum: { $toInt: "$unread_message" } },
          },
        },
        { $sort: { "latest_message.timestamp": -1 } },
      ]).exec();

      if (active.length) {
        results = results.concat(
          active.map((chat) => ({
            ...chat,
            unread_message_count: chat.unread_message_count,
          }))
        );
      }
    }

    return results;
  }
}