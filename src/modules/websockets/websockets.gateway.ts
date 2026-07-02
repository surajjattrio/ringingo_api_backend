import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as moment from "moment";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  AgentLiveReportDocument,
  AgentLiveReportSchema,
} from "../call-center/schema/agent-live-report.schema";
import {
  WhatsappsyncDocument,
  WhatsappsyncSchema,
} from "../whatsapp-sync/schema/whatsappmsync.schema";
import {
  WhatsappmessageDocument,
  WhatsappmessageSchema,
} from "../whatsapp-message/schema/whatsappmessage.schema";
import {
  MessagingChannelDocument,
  MessagingChannelSchema,
} from "../messaging-channel/schema/messaging-channel.schema";
import {
  Whatsapp_available_agentDocument,
  Whatsapp_available_agentSchema,
} from "../agent/schema/whatsapp_available_agent.schema";
import {
  OmnichannelsyncDocument,
  OmnichannelsyncSchema,
} from "../omnichannel-sync/schema/omnichannelsync.schema";
import {
  OmnichannelmessageDocument,
  OmnichannelmessageSchema,
} from "../omnichannel-message/schema/omnichannelmessage.schema";

@Injectable()
// @WebSocketGateway({ cors: "*" })
@WebSocketGateway({
  cors: { origin: "*" },
  pingInterval: 30000,
  pingTimeout: 60000,
})
export class SocketService implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private activeSessions = new Map<string, Socket>();
  private userSockets = new Map<string, string>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    @InjectModel(AgentLiveReportSchema.name)
    private readonly agent_live_report: Model<AgentLiveReportDocument>,
    @InjectModel(WhatsappsyncSchema.name)
    private readonly whatsapp_sync: Model<WhatsappsyncDocument>,
    @InjectModel(OmnichannelsyncSchema.name)
    private readonly omnichannel_sync: Model<OmnichannelsyncDocument>,
    @InjectModel(OmnichannelmessageSchema.name)
    private readonly omnichannelmessage: Model<OmnichannelmessageDocument>,
    @InjectModel(WhatsappmessageSchema.name)
    private readonly whatsappmessage: Model<WhatsappmessageDocument>,
    @InjectModel(MessagingChannelSchema.name)
    private readonly messaging_channel: Model<MessagingChannelDocument>,
    @InjectModel(Whatsapp_available_agentSchema.name)
    private readonly wa_available_agent: Model<Whatsapp_available_agentDocument>,
  ) { }

  onModuleInit() {
    this.server.on("connection", (socket: Socket) => {
      console.log("Connected!!!");

      // const browserToken = socket.handshake.query.token;
      // const newbrowserToken = socket.handshake.query.new_token;
      // const uuid = socket.handshake.query.uuid;

      const user_uuid = Array.isArray(socket.handshake.query.user_uuid)
        ? socket.handshake.query.user_uuid[0]
        : socket.handshake.query.user_uuid;

      const {
        token,
        new_token,
        uuid,
        agent_uuid,
        browserToken,
        newbrowserToken,
      } = socket.handshake.query;

      console.log("socket.handshake.query", socket.handshake.query);

      console.log("socket", socket.id, browserToken, newbrowserToken, uuid);

      if (user_uuid) {
        this.userSockets.set(user_uuid, socket.id);
        socket.join(user_uuid);
        socket.data.user_uuid = user_uuid; // keep for debugging
        console.log("joined user room:", user_uuid, "socket:", socket.id);
        console.log(`User ${user_uuid} registered with socket ${socket.id}`);
      }

      if (agent_uuid) {
        // socket.join(agent_uuid);
        socket.join(uuid);
        console.log(`Agent ${agent_uuid} connected and joined room.`);
      }

      const oldcompositeKey = `${uuid}-${browserToken}`;
      const newcompositeKey = `${uuid}-${newbrowserToken}`;

      // ✅ CANCEL PENDING LOGOUT IF RECONNECT HAPPENS
      const pendingTimer = this.disconnectTimers.get(oldcompositeKey);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.disconnectTimers.delete(oldcompositeKey);
        console.log("Reconnect detected, logout cancelled");
      }

      if (browserToken !== undefined) {
        if (newbrowserToken !== "empty") {
          this.activeSessions.set(newcompositeKey, socket);
        }

        const previousSocket = this.activeSessions.get(oldcompositeKey);
        if (previousSocket) {
          console.log("COMING FOR LOGOUT");
          if (newbrowserToken !== "empty") {
            previousSocket.emit("logout");
          }
          previousSocket.disconnect();
        }
      }

      // socket.on("disconnect", () => {
      //   this.activeSessions.delete(oldcompositeKey);
      //   console.log(`User with browser token ${browserToken} disconnected`);
      // });

      // ✅ GRACEFUL DISCONNECT HANDLING
      socket.on("disconnect", (reason) => {
        const sessionKey = socket.data.sessionKey;

        console.log(
          `Socket disconnected (${reason}) → starting grace timer`,
          sessionKey
        );

        const timer = setTimeout(() => {
          this.activeSessions.delete(sessionKey);
          this.disconnectTimers.delete(sessionKey);
          console.log(`Session fully logged out: ${sessionKey}`);
        }, 40_000); // 🔥 40s grace period

        this.disconnectTimers.set(sessionKey, timer);
      });
    });
  }

  //   this.server.on("connection", (socket: Socket) => {
  //     console.log("Connected!!!");

  //     // const browserToken = socket.handshake.query.token;
  //     // const newbrowserToken = socket.handshake.query.new_token;
  //     // const uuid = socket.handshake.query.uuid;

  //     const user_uuid = Array.isArray(socket.handshake.query.user_uuid)
  //       ? socket.handshake.query.user_uuid[0]
  //       : socket.handshake.query.user_uuid;

  //     const {
  //       token,
  //       new_token,
  //       uuid,
  //       agent_uuid,
  //       browserToken,
  //       newbrowserToken,
  //     } = socket.handshake.query;

  //     console.log("socket.handshake.query", socket.handshake.query);

  //     console.log("socket", socket.id, browserToken, newbrowserToken, uuid);

  //     if (user_uuid) {
  //       this.userSockets.set(user_uuid, socket.id);
  //       socket.join(user_uuid);
  //       socket.data.user_uuid = user_uuid; // keep for debugging
  //       console.log("joined user room:", user_uuid, "socket:", socket.id);
  //       console.log(`User ${user_uuid} registered with socket ${socket.id}`);
  //     }

  //     if (agent_uuid) {
  //       // socket.join(agent_uuid);
  //       socket.join(uuid);
  //       console.log(`Agent ${agent_uuid} connected and joined room.`);
  //     }

  //     const oldcompositeKey = `${uuid}-${browserToken}`;
  //     const newcompositeKey = `${uuid}-${newbrowserToken}`;

  //     if (browserToken !== undefined) {
  //       if (newbrowserToken !== "empty") {
  //         this.activeSessions.set(newcompositeKey, socket);
  //       }

  //       const previousSocket = this.activeSessions.get(oldcompositeKey);
  //       if (previousSocket) {
  //         console.log("COMING FOR LOGOUT");
  //         if (newbrowserToken !== "empty") {
  //           previousSocket.emit("logout");
  //         }
  //         previousSocket.disconnect();
  //       }
  //     }

  //     socket.on("disconnect", () => {
  //       this.activeSessions.delete(oldcompositeKey);
  //       console.log(`User with browser token ${browserToken} disconnected`);
  //     });
  //   });
  // }

  // @SubscribeMessage("agent_update_time")
  // handleAgentUpdateTime(@MessageBody() data: any): void {
  //   const { browserToken, agent_uuid } = data;
  //   console.log("Received agent_update_time", browserToken, agent_uuid);

  //   const current_time = moment().format("YYYY-MM-DD HH:mm:ss");
  //   const fourMinutesAgo = moment().subtract(4, "minutes");
  //   const formattedFourMinutesAgo = fourMinutesAgo.format(
  //     "YYYY-MM-DD HH:mm:ss"
  //   );

  //   console.log("current_time", current_time);
  //   console.log("four minute ago time", formattedFourMinutesAgo);

  //   // Example database update logic
  //   this.agent_live_report
  //     .updateOne(
  //       { status: { $ne: "6" }, agent_uuid },
  //       { agent_idle_time: current_time }
  //     )
  //     .exec();
  //   this.agent_live_report
  //     .updateOne(
  //       { status: "0", agent_idle_time: { $lt: formattedFourMinutesAgo } },
  //       { status: "6" }
  //     )
  //     .exec();
  // }

  @SubscribeMessage("om:accept")
  public async onOmnichannelAccept(
    @MessageBody()
    data: {
      tenant_uuid: string;
      user_uuid: string;
      agent_uuid?: string;
      browserToken?: string;
      from_number: string;
      phone_number_id: string;
      actionId?: string; // optional correlation id from FE
      channel_identifiers?: any;
      channel_type: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const tenant_uuid = data.tenant_uuid;
      const channel_type = data.channel_type;
      const channel_identifiers = data.channel_identifiers;
      // Build dynamic query based on channel_identifiers

      // const getContactIdentifier = (
      //   channel_type: string,
      //   identifiers: any,
      //   data: any
      // ): string => {
      //   if (channel_type === "WhatsApp") {
      //     return identifiers.from_number || data.from_number;
      //   } else if (channel_type === "instagram") {
      //     return (
      //       identifiers.sender_igid || identifiers.sender_id || data.from_number
      //     );
      //   } else if (channel_type === "facebook") {
      //     return identifiers.sender_id || data.from_number;
      //   } else {
      //     // Default to from_number or first available identifier
      //     return (
      //       data.from_number ||
      //       identifiers.sender_id ||
      //       (Object.values(identifiers)[0] as string)
      //     );
      //   }
      // };

      // const contact_identifier = getContactIdentifier(
      //   channel_type,
      //   channel_identifiers,
      //   data
      // );

      const buildChannelQuery = (
        tenant_uuid: string,
        channel_type: string,
        identifiers: any
      ) => {
        const query: any = {
          tenant_uuid: tenant_uuid,
          // type: channel_type,
        };

        // Map channel identifiers to customFields based on channel type
        if (
          channel_type === "WhatsApp" &&
          identifiers.from_number
        ) {
          if (identifiers.phone_number_id) {
            query["customFields.phone_number_id"] = identifiers.phone_number_id;
          }
        } else if (
          channel_type === "instagram" &&
          identifiers.instagram_business_account_id
        ) {
          query["customFields.instagram_business_account_id"] =
            identifiers.instagram_business_account_id;
          if (identifiers.instagram_page_id) {
            query["customFields.instagram_page_id"] =
              identifiers.instagram_page_id;
          }
        } else if (channel_type === "meta" && identifiers.business_account_id) {
          // Generic Meta channel (could be Facebook, Instagram, or WhatsApp)
          query["customFields.business_account_id"] =
            identifiers.business_account_id;
          if (identifiers.page_id) {
            query["customFields.page_id"] = identifiers.page_id;
          }
        } else {
          // Generic fallback - add all identifiers to customFields
          for (const [key, value] of Object.entries(identifiers)) {
            query[`customFields.${key}`] = value;
          }
        }

        return query;
      };
      const channelQuery = buildChannelQuery(
        data.tenant_uuid,
        data.channel_type,
        data.channel_identifiers
      );
      const channel = await this.messaging_channel.findOne(channelQuery).exec();

      console.log("channel", channel);
      if (!channel) {
        const errPayload = {
          reason: "NO_CHANNEL",
          message: "Messaging channel not found for this phone_number_id",
          payload: data,
        };
        if (data.agent_uuid)
          this.server.to(data.agent_uuid).emit("in:accept:error", errPayload);
        else client.emit("in:accept:error", errPayload);
        return;
      }
      console.log("channel found");

      const buildSyncFilter = (data: any) => {
        const filter: any = {
          tenant_uuid: data.tenant_uuid,
          channel_type: data.channel_type,
        };

        if (data.channel_type === "WhatsApp") {
          filter["from_number"] = data.from_number;
          filter["channel_identifiers.phone_number_id"] = data.phone_number_id;
          // ❌ DO NOT add channel_identifiers to filter for WhatsApp
        } else if (data.channel_type === "instagram") {
          filter["from_number"] = data.channel_identifiers?.sender_igid || data.from_number;
          filter["channel_identifiers.instagram_business_account_id"] =
            data.channel_identifiers?.instagram_business_account_id;
        }

        return filter;
      };


      // Build update object for omnichannel_sync
      const buildSyncUpdate = (
        data: any,
        channel_type: any,
        tenant_uuid: any,
        channel_identifiers: any
      ) => {
        const update: any = {
          $set: {
            user_uuid: data.user_uuid,
            browserToken: data.browserToken ?? "",
            channel_type: channel_type,
          },
          $setOnInsert: {
            tenant_uuid: tenant_uuid,
            channel_identifiers: channel_identifiers,
            from_number: data.from_number
            // uuid will come from schema default randomUUID()
          },
        };

        return update;
      };

      const filter = buildSyncFilter(data);
      console.log(filter, "channel_identifiers,,,,,,,,,,");
      const update = buildSyncUpdate(
        data,
        channel_type,
        tenant_uuid,
        channel_identifiers
      );

      const syncResult: any = await this.omnichannel_sync
        .findOneAndUpdate(filter, update, {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          rawResult: true, // <-- tells you if it inserted
        })
        .exec();

      // Inspect what happened

      const wasInserted = Boolean(syncResult?.lastErrorObject?.upserted);
      console.log("UPSERT =>", {
        db: this.omnichannel_sync.db.name,
        coll: this.omnichannel_sync.collection.name,
        wasInserted,
        upsertedId: syncResult?.lastErrorObject?.upserted,
        matched: syncResult?.lastErrorObject?.n,
        doc: {
          _id: syncResult?.value?._id?.toString(),
          uuid: syncResult?.value?.uuid,
          tenant_uuid: syncResult?.value?.tenant_uuid,
          channel_type: syncResult?.value?.channel_type,
          channel_identifiers: syncResult?.value?.channel_identifiers,
          user_uuid: syncResult?.value?.user_uuid,
        },
      });
      const buildMessageFilter = (data: any) => {
        const messageFilter: any = {
          tenant_uuid: tenant_uuid,
          channel_type: channel_type,
          from_number: data.from_number
          // from_number: "",
          // sender_id: ""
        };

        return messageFilter;
      };

      console.log("syncResult", syncResult);

      const messageFilter = buildMessageFilter(data);

      await this.omnichannelmessage
        .updateMany(messageFilter, { $set: { user_uuid: data.user_uuid } })
        .exec();

      // 4) Notify others to clear unread
      const others = await this.wa_available_agent
        .find(
          {
            phone_number_id: data.phone_number_id,
            user_uuid: { $ne: data.user_uuid },
          },
          { browserToken: 1 }
        )
        .exec();

      const otherTokens = (others ?? [])
        .map((a) => a.browserToken)
        .filter(Boolean);
      if (otherTokens.length) this.server.emit("removeUnread", otherTokens);

      // 5) Ack success to the acceptor
      // const ackPayload = {
      //   ok: true,
      //   actionId: data.actionId,
      //   from_number: data.from_number,
      //   phone_number_id: data.phone_number_id,
      //   sync_uuid: syncResult.uuid,
      //   user_uuid: data.user_uuid,
      //   tenant_uuid: data.tenant_uuid,
      // };

      // if (data.agent_uuid)
      //   this.server.to(data.agent_uuid).emit("in:accepted", ackPayload);
      // else client.emit("in:accepted", ackPayload);

      // 6) Close popups for everyone (including acceptor)
      this.emitUiClosePopupAll({
        channelType: data.channel_type,
        reason: "accepted",
        // from_number: data?.from_number,
        // phone_number_id: data?.phone_number_id,
        // actionId: data?.actionId,
        // popupKey: `om:${data?.phone_number_id}:${data?.from_number}` || ,
      });
    } catch (err) {
      const errPayload = {
        reason: "SERVER_ERROR",
        message: (err as Error).message,
        payload: data,
      };
      if (data.agent_uuid)
        this.server.to(data.agent_uuid).emit("in:accept:error", errPayload);
      else client.emit("in:accept:error", errPayload);
    }
  }
  // Put Agent on Break
  emitToAgent(agent_uuid: string, event: any) {
    console.log("Inside socket gateway", event);
    this.server.to(agent_uuid).emit("agent-event", event);
  }

  emitAgentStateEvent(agent_uuid: string, type: string, payload: any) {
    console.log("Inside socket gateway", type, payload);
    if (!agent_uuid) return;
    this.server.to(agent_uuid).emit("agent-event", {
      type,
      payload: payload ?? {}
    });
    console.log("socket snett");
  }

  adminLogout(agent_uuid: string, data: any) {
    console.log("Inside socket gateway", data);
    this.server.to(agent_uuid).emit("logout-admin", data);
  }

  // emitToUser(user_uuid: string, payload: any) {
  //   const socketId = this.userSockets.get(user_uuid);
  //   console.log("emitToUser -> user_uuid:", user_uuid, "socketId:", socketId);

  //   if (!socketId) return;

  //   // Is this socket connected to THIS node?
  //   const sock = this.server.sockets.sockets.get(socketId);
  //   console.log("emitToUser -> sock:", sock);
  //   if (!sock) {
  //     console.log("Socket not found on this node (cluster without adapter?)");
  //     console.warn("Socket not found on this node (cluster without adapter?)");
  //     return;
  //   }

  //   // Emit directly
  //   sock.emit("whatsapp_message_live", payload);
  // }

  emitToUser(user_uuid: string, payload: any) {
    if (!user_uuid) return;
    this.server
      .to(user_uuid)
      // .timeout(2000)
      .emit("whatsapp_message_live", payload, (err: any, responses: any[]) => {
        if (err) {
          console.warn("Ack timeout/error for user:", user_uuid, err);
        } else {
          console.log("Client ACKs for user", user_uuid, responses);
        }
      });
  }

  emitWhatsappMessage(payload: any, room?: string) {
    if (room) {
      this.server.to(room).emit("whatsapp_message", payload);
    } else {
      this.server.emit("whatsapp_message", payload);
    }
  }

  @SubscribeMessage("join_user_room")
  handleJoinUserRoom(
    @MessageBody() userUuid: string,
    @ConnectedSocket() socket: Socket
  ) {
    socket.join(`user:${userUuid}`);
  }

  emitOmnichannelMessage(
    payload: any,
    userUuids: string[] = [],
    room?: string
  ) {
    // If room is provided (legacy / special cases)
    if (room) {
      this.server.to(room).emit("omnichannel_message", payload);
      return;
    }

    // 🚫 Never allow global broadcast
    if (!userUuids.length) {
      console.warn(
        "⚠️ emitOmnichannelMessage called without recipients. Emission skipped."
      );
      return;
    }

    // ✅ Emit only to allowed users
    for (const userUuid of userUuids) {
      this.server.to(`user:${userUuid}`).emit(
        "omnichannel_message",
        payload
      );
    }
  }

  // emitOmnichannelMessage(payload: any, room?: string) {
  //   if (room) {
  //     this.server.to(room).emit("omnichannel_message", payload);
  //   } else {
  //     this.server.emit("omnichannel_message", payload);
  //   }
  // }

  emitUiClosePopupAll(payload: {
    // from_number: string;
    // phone_number_id: string;
    reason: "accepted" | "assigned_elsewhere" | string;
    // actionId?: string; // optional to correlate FE action
    // popupKey?: string; // optional to close only a specific popup
    channelType: string;
  }) {
    this.server.emit("ui:closePopup", payload);
  }

  @SubscribeMessage("logout")
  onLogout(@MessageBody() body: any): void {
    this.server.emit("logout", body);
  }
}