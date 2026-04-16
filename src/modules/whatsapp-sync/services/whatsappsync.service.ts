// import { Injectable, OnModuleInit } from "@nestjs/common";
// import { InjectModel } from "@nestjs/mongoose";
// import { Model } from "mongoose";
// import { v4 as uuidv4 } from 'uuid';
// import { CommonDBFunctions } from "src/modules/common/common_db_functions";
// import { WhatsappsyncDocument, WhatsappsyncSchema } from "../schema/whatsappmsync.schema";
// import { ExtensionDocument, ExtensionSchema } from "../../extension/schema/extension.schema";
// import { Whatsup_available_agentDocument, Whatsup_available_agentSchema } from "src/modules/agent/schema/whatsapp_available_agent.schema";
// import { WhatsappmessageDocument, WhatsappmessageSchema } from "../../whatsapp-message/schema/whatsappmessage.schema";
// import { Injectable, OnModuleInit } from "@nestjs/common";
// import { io, Socket } from "socket.io-client";

// @Injectable()
// export class WhatsappsyncService implements OnModuleInit {
// private socket: Socket;

//   constructor(
//     @InjectModel( WhatsappsyncSchema.name ) private readonly whatsup_sync: Model<WhatsappsyncDocument>,
//     @InjectModel( ExtensionSchema.name ) private readonly extensions: Model<ExtensionDocument>,
//     @InjectModel( WhatsappmessageSchema.name ) private readonly whatsappmessage: Model<WhatsappmessageDocument>,
//     @InjectModel( Whatsup_available_agentSchema.name ) private whatsup_available_agent: Model<Whatsup_available_agentDocument>,
//     private readonly commonDbFn: CommonDBFunctions
//   ) {
//     // Initialize the Socket.IO client
// this.socket = io( 'https://lab.belsmart.io:5002' ); // Replace with your server URL
// this.setupSocketEvents();
//   }

//   onModuleInit () {
//     console.log( 'WhatsappsyncService initialized' );
//   }

//   private setupSocketEvents () {
//     this.socket.on( 'connect', () => {
//       console.log( 'Connected to socket server' );
//     } );

//     this.socket.on( 'disconnect', () => {
//       console.log( 'Disconnected from socket server' );
//     } );

//     // Handle other custom events if needed
//     this.socket.on( 'message_from_server', ( data ) => {
//       console.log( 'Received message from server:', data );
//     } );
//   }

//   async create ( params ) {
//     params.uuid = uuidv4();
//     if ( !params.uuid ) {
//       throw new Error( 'UUID is required' );
//     }

//     params.tenant_uuid = params.tenant_uuid;
//     params.user_uuid = params.user_uuid;
//     params.from_number = params.from_number;
//     const phone_number_id = params.phone_number_id;

//     let logMessages = {
//       logErrorMsg: "whatsappsync already exists \n",
//       logSuccessMsg: "whatsappsync created successfully \n"
//     };

//     try {
//       const insertResult = await this.commonDbFn.insert( this.whatsup_sync, params, JSON.stringify( logMessages ) );
//       console.log( logMessages.logSuccessMsg );

//       const whatsup_available_agent: any = await this.whatsup_available_agent.find( { phone_number_id } ).exec();
//       console.log( whatsup_available_agent );
//       console.log( "whatsup_available_agent" );

//       const matchedAgent = whatsup_available_agent.filter( agent => agent.user_uuid !== params.user_uuid );
//       if ( matchedAgent.length > 0 ) {
//         console.log( 'Mismatched agent found:', matchedAgent );
//         const matchedBrowserToken = matchedAgent.map( agent => agent.browserToken );
//         console.log( 'Mismatched' );
//         console.log( matchedBrowserToken );

//         setTimeout( () => {
//           console.log( 'Emitting removeUnread event with tokens:', matchedBrowserToken );
//           this.socket.emit( "removeUnread", matchedBrowserToken );
//         }, 1000 );
//       }

//       const updateResult = await this.whatsappmessage.updateMany(
//         { from_number: params.from_number },
//         { $set: { user_uuid: params.user_uuid } }
//       ).exec();

//       return insertResult;
//     } catch ( error ) {
//       console.error( logMessages.logErrorMsg, error );
//       throw new Error( 'Error creating whatsappsync and updating messages' );
//     }
//   }
// }

import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import {
  WhatsappsyncDocument,
  WhatsappsyncSchema,
} from "../schema/whatsappmsync.schema";
import {
  ExtensionDocument,
  ExtensionSchema,
} from "../../extension/schema/extension.schema";
import {
  Whatsapp_available_agentDocument,
  Whatsapp_available_agentSchema,
} from "src/modules/agent/schema/whatsapp_available_agent.schema";
const { v4: uuidv4 } = require("uuid"); // Assuming you use the 'uuid' package
import {
  WhatsappmessageDocument,
  WhatsappmessageSchema,
} from "../../whatsapp-message/schema/whatsappmessage.schema";
// import { Server } from "socket.io";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
// import io, { Socket } from "socket.io-client";
import {
  MessagingChannelDocument,
  MessagingChannelSchema,
} from "../../messaging-channel/schema/messaging-channel.schema";
// import { Socket } from "socket.io";
//import io from "socket.io-client";
import { SocketService } from "../../websockets/websockets.gateway";
import axios from 'axios';
import * as fs from "fs";
import * as path from "path";
@Injectable()
@WebSocketGateway({ cors: "*" })
// export class WhatsappsyncService implements OnModuleInit {
export class WhatsappsyncService {
  commonFn: any;
  // private server: Server;
  // private socket: Socket;

  /*
  @Usage : To load whatsappsync schema and other libraries
  @Param @InjectModel: It will load whatsappsync schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[whatsappsync,commonFn,commonDbFn]
  */

  constructor(
    @InjectModel(WhatsappsyncSchema.name)
    private readonly whatsapp_sync: Model<WhatsappsyncDocument>,
    @InjectModel(ExtensionSchema.name)
    private readonly extensions: Model<ExtensionDocument>,
    @InjectModel(WhatsappmessageSchema.name)
    private readonly whatsappmessage: Model<WhatsappmessageDocument>,
    @InjectModel(Whatsapp_available_agentSchema.name)
    private whatsapp_available_agent: Model<Whatsapp_available_agentDocument>,
    @InjectModel(MessagingChannelSchema.name)
    private readonly messaging_channel: Model<MessagingChannelDocument>,
    private readonly socketService: SocketService,
    private readonly commonDbFn: CommonDBFunctions
  ) { }

  // onModuleInit () {
  //   console.log( 'WebSocket server initialized' );

  //   this.server.on( 'connection', ( socket ) => {
  //     console.log( 'Client connected:', socket.id );

  //     socket.on( 'disconnect', () => {
  //       console.log( 'Client disconnected:', socket.id );
  //     } );
  //   } );
  // }

  /*
  @Usage                 : First it will check whether given name exist or not , if not then new whatsappsync will be created else it will throw error
  @Param createWhatsappsyncDto    : Request paramter that we set into dto
  @return Object         :  Success / Error
  */

  // async create ( params ) {
  //   // Generate a new UUID for the params
  //   params.uuid = uuidv4();
  //   if ( !params.uuid ) {
  //     throw new Error( 'UUID is required' );
  //   }

  //   // Ensure necessary fields are set
  //   params.tenant_uuid = params.tenant_uuid;
  //   params.user_uuid = params.user_uuid;
  //   params.from_number = params.from_number;

  //   // Define log messages for the insertion operation
  //   let logMessages = {
  //     logErrorMsg: "whatsappsync already exists \n",
  //     logSuccessMsg: "whatsappsync created successfully \n"
  //   };

  //   try {
  //     // Insert into the whatsup_sync collection
  //     const insertResult = await this.commonDbFn.insert( this.whatsup_sync, params, JSON.stringify( logMessages ) );

  //     // Log the successful insertion
  //     console.log( logMessages.logSuccessMsg );

  //     // Update the user_uuid in the whatsappmessage collection
  //     const updateResult = await this.whatsappmessage.updateMany(
  //       { from_number: params.from_number },
  //       { $set: { user_uuid: params.user_uuid } }
  //     ).exec();

  //     // Log the update result
  //     console.log( `Updated ${updateResult} messages` );

  //     return insertResult;
  //   } catch ( error ) {
  //     // Log the error message
  //     console.error( logMessages.logErrorMsg, error );

  //     throw new Error( 'Error creating whatsappsync and updating messages' );
  //   }
  // }

  // async create ( params ) {
  //   // Generate a new UUID for the params
  //   // params.uuid = uuidv4();
  //   // if ( !params.uuid ) {
  //   //   throw new Error( 'UUID is required' );
  //   // }

  //   // Ensure necessary fields are set
  //   // params.tenant_uuid = params.tenant_uuid;
  //   // params.user_uuid = params.user_uuid;
  //   // params.from_number = params.from_number;

  //   params.tenant_uuid = params.tenant_uuid || '';
  //   params.user_uuid = params.user_uuid || '';
  //   params.from_number = params.from_number || '';
  //   params.phone_number_id = params.phone_number_id || '';
  //   params.whatsapp_messaging_channel_uuid = params.whatsapp_messaging_channel_uuid || '';

  //   let messaging_channel;
  //   // Check if phone_number_id is provided
  //   if ( params.phone_number_id ) {
  //     // If phone_number_id is provided, use it to find the messaging channel
  //     messaging_channel = await this.messaging_channel.findOne( {
  //       tenant_uuid: params.tenant_uuid,
  //       'customFields.phone_number_id': params.phone_number_id,
  //       type: 'WhatsApp'
  //     }, {
  //       'customFields.token': 1,
  //       'customFields.phone_number_id': 1,
  //       'customFields.from_number': 1,
  //       'customFields.whatsapp_business_account_id': 1,
  //       uuid: 1
  //     } ).exec();
  //   } else {
  //     // If phone_number_id is not provided, use whatsapp_messaging_channel_uuid to find the messaging channel
  //     messaging_channel = await this.messaging_channel.findOne( {
  //       tenant_uuid: params.tenant_uuid,
  //       uuid: params.whatsapp_messaging_channel_uuid,
  //       type: 'WhatsApp'
  //     }, {
  //       'customFields.token': 1,
  //       'customFields.phone_number_id': 1,
  //       'customFields.from_number': 1,
  //       'customFields.whatsapp_business_account_id': 1,
  //       uuid: 1
  //     } ).exec();
  //   }

  //   if ( messaging_channel ) {
  //     // Update params with phone_number_id from the messaging channel
  //     params.phone_number_id = messaging_channel.customFields.phone_number_id;
  //   } else {
  //     console.log( "No messaging channel found with the provided whatsapp_messaging_channel_uuid." );
  //   }

  //   // Define log messages for the insertion operation
  //   let logMessages = {
  //     logErrorMsg: "whatsappsync already exists \n",
  //     logSuccessMsg: "whatsappsync created successfully \n"
  //   };

  //   try {
  //     // Insert into the whatsup_sync collection
  //     const insertResult = await this.commonDbFn.insert( this.whatsapp_sync, params, JSON.stringify( logMessages ) );

  //     // Log the successful insertion
  //     console.log( logMessages.logSuccessMsg );

  //     // Update the user_uuid in the whatsappmessage collection
  //     const updateResult = await this.whatsappmessage.updateMany(
  //       { from_number: params.from_number },
  //       { $set: { user_uuid: params.user_uuid } }
  //     ).exec();

  //     // Log the update result
  //     console.log( `Updated ${updateResult} messages` );

  //     // // Emit an event to notify clients of the new whatsappsync creation
  //     // this.server.emit( 'newWhatsappSync', { uuid: params.uuid, user_uuid: params.user_uuid } );

  //     return insertResult;
  //   } catch ( error ) {
  //     // Log the error message
  //     console.error( logMessages.logErrorMsg, error );

  //     throw new Error( 'Error creating whatsappsync and updating messages' );
  //   }
  // }

  async create(params: any) {
    try {
      // 1) Validate payload
      if (!params || typeof params !== "object")
        throw new Error("Invalid webhook body");
      if (params.object !== "whatsapp_business_account") return { ok: true };

      const entries = Array.isArray(params.entry) ? params.entry : [];
      if (!entries.length) return { ok: true };

      for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
          console.log("change", change);
          const value: any = change?.value ?? {};
          const phone_number_id: string =
            value?.metadata?.phone_number_id || "";
          const display_phone_number: string =
            value?.metadata?.display_phone_number || "";

          // ----- A) Handle inbound messages -----
          if (Array.isArray(value.messages) && value.messages.length > 0) {
            // Optional enrichment
            const channel = phone_number_id
              ? await this.messaging_channel
                .findOne(
                  {
                    "customFields.phone_number_id": phone_number_id,
                    type: "WhatsApp",
                  },
                  { uuid: 1, tenant_uuid: 1, customFields: 1 }
                )
                .lean()
              : null;

            // Arrays for URLs
            let imagesURL: string[] = [];
            let documentsURL: string[] = [];

            for (const msg of value.messages) {
              const from_number: string = msg?.from || "";

              const messageBody: string =
                msg?.text?.body ??
                msg?.interactive?.button_reply?.title ??
                msg?.interactive?.list_reply?.title ??
                msg?.image?.caption ??
                msg?.document?.filename ??
                "";

              const provider_message_id: string = msg?.id || "";
              const ts = Number(msg?.timestamp);
              const when = Number.isFinite(ts)
                ? new Date(ts * 1000)
                : new Date();

              // Persist idempotently (keyed by wamid)
              const docToInsert = {
                // uuid: uuidv4(),
                tenant_uuid: channel?.tenant_uuid ?? "",
                user_uuid: "", // filled when accepted/assigned
                whatsapp_messaging_channel_uuid: channel?.uuid ?? "",
                phone_number_id,
                from_number,
                to:
                  channel?.customFields?.from_number ||
                  display_phone_number ||
                  "",
                direction: "inbound",
                type: msg?.type || "text",
                text_content: messageBody || "",
                provider_message_id,
                timestamp: when,
                status: "received",
                media: msg?.image
                  ? {
                    kind: "image",
                    id: msg.image.id,
                    caption: msg.image.caption ?? "",
                  }
                  : msg?.document
                    ? {
                      kind: "document",
                      id: msg.document.id,
                      filename: msg.document.filename ?? "",
                    }
                    : undefined,
                raw: msg,
              };

              let filePath = "";
              const token = channel?.customFields?.token; // 🔐 make sure this env is set
              const mediaDir = path.join(process.cwd(),  "upload/whatsapp_image/receive");
              // Inside for (const msg of value.messages)
              if (msg?.type === "image" && msg?.image?.id) {
                try {
                  const mediaId = msg.image.id;


                  // ensure directory exists
                  fs.mkdirSync(mediaDir, { recursive: true });

                  // Step 1: get media URL from WhatsApp API
                  const mediaMetaRes = await axios.get(
                    `https://graph.facebook.com/v20.0/${mediaId}`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );

                  const mediaUrl = mediaMetaRes.data?.url;
                  if (mediaUrl) {
                    // Step 2: download binary
                    const mediaRes = await axios.get(mediaUrl, {
                      responseType: "arraybuffer",
                      headers: { Authorization: `Bearer ${token}` },
                    });

                    // Step 3: write to local file
                    const fileExt = msg.image.mime_type?.split("/")[1] || "jpg";
                    filePath = path.join(mediaDir, `${mediaId}.${fileExt}`);
                    //let imageurl = path.join(process.env.DOCUMENT_IMAGES_URL, 'receive/', `${mediaId}.${fileExt}`);
		    let imageurl = `${process.env.DOCUMENT_IMAGES_URL}receive/${mediaId}.${fileExt}`;

                    fs.writeFileSync(filePath, mediaRes.data);

                    console.log(`✅ Image saved: ${filePath}`);

                    imagesURL.push(imageurl)
                    // Attach file info for database storage
                    docToInsert.media = {
                      kind: "image",
                      id: mediaId,
                      caption: msg.image.caption ?? "",
                      mime_type: msg.image.mime_type,
                      local_path: filePath,
                    } as any;
                  }
                } catch (downloadErr) {
                  console.error("⚠️ Error downloading image:", downloadErr);
                }
              } else if (msg?.type === "document" && msg?.document?.id) {
                const mediaId = msg.document.id;
                // const mediaDir = path.resolve(
                //   process.cwd(),
                //   "upload/whatsapp_document/receive"
                // );
                fs.mkdirSync(mediaDir, { recursive: true });

                const mediaMetaRes = await axios.get(
                  `https://graph.facebook.com/v20.0/${mediaId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                const mediaUrl = mediaMetaRes.data?.url;
                if (mediaUrl) {
                  const mediaRes = await axios.get(mediaUrl, {
                    responseType: "arraybuffer",
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  // detect extension from mime type or filename
                  const fileExt =
                    msg.document.mime_type?.split("/")[1] ||
                    msg.document.filename?.split(".").pop() ||
                    "bin";
                  const fileName = `${mediaId}.${fileExt}`;
                  const filePath = path.join(mediaDir, fileName);
                  //let docurl = path.join(process.env.DOCUMENT_IMAGES_URL, 'receive/', `${mediaId}.${fileExt}`);
		  let docurl = `${process.env.DOCUMENT_IMAGES_URL}receive/${mediaId}.${fileExt}`;

                  fs.writeFileSync(filePath, mediaRes.data);

                  console.log(`✅ Document saved: ${filePath}`);

                  documentsURL.push(docurl);

                  docToInsert.media = {
                    kind: "document",
                    id: msg.document.id,
                    filename: msg.document.filename ?? "",
                  };
                }
              }
              await this.whatsappmessage.updateOne(
                { provider_message_id },
                {
                  $setOnInsert: docToInsert, $set: { status: "received" }, $push: {
                    image_url: {
                      $each: imagesURL, // append new image URL(s)
                    },
                    document_url: {
                      $each: documentsURL, // append new document URL(s)
                    },
                    unread_message:"1"
                  },
                },
                { upsert: true }
              );

              // ----- NEW: routing to avoid popups if already assigned -----
              let targetRoom: string | undefined;
              let assigned_user_uuid: any = "";

              // Check if this number/line is already assigned
              const session = await this.whatsapp_sync
                .findOne({ from_number, phone_number_id }, { user_uuid: 1 })
                .lean();

              const assigned =
                !!session &&
                typeof session.user_uuid === "string" &&
                session.user_uuid.trim() !== "";
              console.log("assigned", assigned);
              if (assigned) {
                // ✅ send directly to assigned user
                assigned_user_uuid = session.user_uuid;
                this.socketService.emitToUser(assigned_user_uuid, {
                  from_number,
                  phone_number_id,
                  to: docToInsert.to,
                  messageBody,
                  messageId: provider_message_id,
                  timestamp: msg?.timestamp,
                  type: msg?.type,
                  image_url: imagesURL,
                  document_url: documentsURL,
                });
                await this.whatsappmessage.updateOne(
                  { provider_message_id },
                  { $set: { user_uuid: assigned_user_uuid } }
                );
              } else {
                // ❌ unassigned → notify available agents
                this.socketService.emitWhatsappMessage({
                  from_number,
                  phone_number_id,
                  to: docToInsert.to,
                  messageBody,
                  messageId: provider_message_id,
                  timestamp: msg?.timestamp,
                  type: msg?.type,
                  image_url: imagesURL,
                  document_url: documentsURL,
                });
              }


              // if (!assigned) {
              //   // unassigned → notify available agents
              //   // (optionally, emit to a line room: this.socketService.emitWhatsappMessage(payload, `wa-line:${phone_number_id}`))
              //   this.socketService.emitWhatsappMessage({
              //     from_number,
              //     phone_number_id,
              //     to: docToInsert.to,
              //     messageBody,
              //     messageId: provider_message_id,
              //     timestamp: msg?.timestamp,
              //     type: msg?.type,
              //   });
              // }
            }
          }

          // ----- B) Handle statuses (delivered/read, etc.) -----
          if (Array.isArray(value.statuses) && value.statuses.length > 0) {
            for (const st of value.statuses) {
              const wamid = st?.id;
              if (!wamid) continue;

              const sts = String(st?.status || "unknown");
              const stTs = Number(st?.timestamp);
              const stWhen = Number.isFinite(stTs)
                ? new Date(stTs * 1000)
                : new Date();

              await this.whatsappmessage.updateOne(
                { provider_message_id: wamid },
                {
                  $set: {
                    status: sts,
                    status_updated_at: stWhen,
                    last_status_payload: st,
                  },
                }
              );
              // (Optional) emit status to assigned agent room if you want
              // this.socketService.emitWhatsappStatus({ phone_number_id, status: st });
            }
          }
        }
      }

      return { ok: true };
    } catch (err) {
      console.error("Webhook processing error:", err);
      return { ok: false, error: (err as Error).message };
    }
  }
}
