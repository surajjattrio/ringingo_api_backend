import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateWhatsappmessageDto } from "../dto/create-whatsappmessage.dto";
import { WhatsappmessageDocument, WhatsappmessageSchema } from "../schema/whatsappmessage.schema";
import { ExtensionDocument, ExtensionSchema } from "../../extension/schema/extension.schema";
import { MessagingChannelDocument, MessagingChannelSchema } from "../../messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueDocument, MessagingQueueSchema } from "../../messaging-queue/schema/messaging-queue.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../../campaigns/blended-campaign/schema/blended-campaign.schema";
import { UnreadwhatsappmessageDocument, UnreadwhatsappmessageSchema } from "../schema/unread_whatsappmessage.schema";
import { AgentDocument, AgentSchema } from "../../agent/schema/agent.schema";
import { LeadManagementDocument, LeadManagementSchema } from "../../lead-management/schema/lead-management.schema";
import { Unread_whatsappmessageDto } from "../dto/unread_whatsappmessage.dto";
import { randomUUID } from "crypto";
import axios from 'axios';
import * as fs from 'fs';
// import { v4 as uuidv4 } from 'uuid';
import { timestamp } from "rxjs";
import { Console } from "console";
import * as moment from 'moment-timezone';

@Injectable()

export class WhatsappmessageService {
  commonFn: any;

  /*
  @Usage : To load whatsappmessage schema and other libraries
  @Param @InjectModel: It will load whatsappmessage schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[whatsappmessage,commonFn,commonDbFn]
  */

  constructor(@InjectModel(WhatsappmessageSchema.name) private readonly whatsappmessage: Model<WhatsappmessageDocument>,
    @InjectModel(ExtensionSchema.name) private readonly extensions: Model<ExtensionDocument>,
    @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
    @InjectModel(MessagingChannelSchema.name) private readonly messaging_channel: Model<MessagingChannelDocument>,
    @InjectModel(MessagingQueueSchema.name) private readonly messaging_queue: Model<MessagingQueueDocument>,
    @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
    @InjectModel(UnreadwhatsappmessageSchema.name) private readonly unread_whatsappmessage: Model<UnreadwhatsappmessageDocument>,
    @InjectModel(AgentSchema.name) private readonly user: Model<AgentDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new whatsappmessage will be created else it will throw error
  @Param createWhatsappmessageDto    : Request paramter that we set into dto
  @return Object         :  Success / Error
  */

  async sendwhatsappmessage(createWhatsappmessageDto: CreateWhatsappmessageDto, image_url: Express.Multer.File[], document_url: Express.Multer.File[],) {
    var { to, text_content, tenant_uuid, uuid, filename, user_uuid, template_name, template_language_code, whatsapp_messaging_channel_uuid, phone_number_id } = createWhatsappmessageDto;
    console.log('Create DTO:', createWhatsappmessageDto);

    let logMessages = {
      logErrorMsg: "Whatsapp Message already exist \n",
      logSuccessMsg: "Whatsapp Message created successfully \n"
    }
    // const messaging_channel = await this.messaging_channel.find( { tenant_uuid, 'customFields.phone_number_id': phone_number_id, type: 'WhatsApp' }, { 'customFields.token': 1, 'customFields.phone_number_id': 1, 'customFields.from_number': 1, 'customFields.whatsapp_business_account_id': 1, uuid: 1 } ).exec();
    //  const messaging_channel = await this.messaging_channel.find( { tenant_uuid, 'uuid': whatsapp_messaging_channel_uuid, type: 'WhatsApp' }, { 'customFields.token': 1, 'customFields.phone_number_id': 1, 'customFields.from_number': 1, 'customFields.whatsapp_business_account_id': 1, uuid: 1 } ).exec();
    let messaging_channel;
    // phone_number_id = '776825372178422';
    // to="919664871161"
    // to = "919033887100"
    if (phone_number_id) {
      messaging_channel = await this.messaging_channel.find({
        tenant_uuid,

        // 'customFields.phone_number_id': phone_number_id,
        type: 'WhatsApp'
      }, {
        'customFields.token': 1,
        'customFields.phone_number_id': 1,
        'customFields.from_number': 1,
        'customFields.whatsapp_business_account_id': 1,
        uuid: 1
      }).exec();
    } else {
      messaging_channel = await this.messaging_channel.find({
        tenant_uuid,
        'uuid': whatsapp_messaging_channel_uuid,
        type: 'WhatsApp'
      }, {
        'customFields.token': 1,
        'customFields.phone_number_id': 1,
        'customFields.from_number': 1,
        'customFields.whatsapp_business_account_id': 1,
        uuid: 1
      }).exec();
    }
    console.log("===messaging_channel===", messaging_channel);
    const from_number = messaging_channel[0].customFields.from_number;
    const accessToken = messaging_channel[0].customFields.token;
    console.log("accessToken", accessToken);
    console.log("from_number", from_number);

    // const phone_number_id = messaging_channel[ 0 ].customFields.phone_number_id;
    const messaging_channel_id = messaging_channel[0].uuid;
    const whatsapp_business_account_ID = messaging_channel[0].customFields.whatsapp_business_account_id;
    if (!whatsapp_business_account_ID) {
      throw new Error('WhatsApp Business Account ID is undefined.');
    }

    // Ensure phone_number_id is correctly assigned
    const resolved_phone_number_id = phone_number_id || messaging_channel[0].customFields.phone_number_id;
    if (!resolved_phone_number_id) {
      throw new Error('Phone Number ID is undefined.');
    }

    // Fetch WhatsApp templates
    let templates = [];

    try {
      const templatesResponse = await axios.get(`https://graph.facebook.com/v22.0/${whatsapp_business_account_ID}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      // console.log( templatesResponse );
      // console.log( "templatesResponse" );
      templates = templatesResponse.data.data;
    } catch (error) {
      console.error('Failed to fetch WhatsApp templates:', error.response ? error.response.data : error.message);
      throw new Error('Failed to fetch WhatsApp templates');
    }
    const helloWorldTemplate = templates.find(template => template.name === "hello_world");

    if (helloWorldTemplate) {
      console.log("Hello World Template:", helloWorldTemplate);
    } else {
      console.log("Hello World template not found");
    }



    const apiUrl = `https://graph.facebook.com/v22.0/${resolved_phone_number_id}/messages`;
    console.log(apiUrl);
    console.log("apiUrl====");
    console.log(accessToken);
    console.log("accessToken====");
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // 24-hour format
    };
    const timestamp = now.toLocaleString('en-US', options).replace(/\//g, '-');
    console.log(timestamp);
    console.log("timestamp====");

    // Query the lead_management collection with OR condition
    const lead_management_document = await this.lead_management.findOne({
      tenant_uuid,
      user_uuid,
      $or: [
        { "custom_phone_number": to },
        { "phone_number": to }
      ]
    }).sort({ timestamp: 1 }).limit(1).exec();

    console.log(lead_management_document);
    let lead_management;
    let name = "";
    if (lead_management_document) {
      console.log("Lead Management UUID:", lead_management_document.lead_management_uuid);
      lead_management = lead_management_document.lead_management_uuid;
      const first_name = lead_management_document.first_name || "";
      const last_name = lead_management_document.last_name || "";
      name = `${first_name} ${last_name}`;
      console.log(`lead_management_uuid: ${lead_management}`);
      console.log(`Lead Name: ${name}`);
    } else {
      console.log("totototototototototototototo :", to)
      const new_lead_uuid = randomUUID();
      const insert_lead_mgmt_string = {
        "address": '',
        "state": '',
        "province": '',
        "postal_code": '',
        "dob": '',
        "phone_code": '',
        "alternate_phone_number": '',
        "email": '',
        "status": '0',
        "gender": '0',
        "created_flag": '2',
        "country_uuid": '',
        "city": '',
        "first_name": "Anonymous",
        "last_name": "",
        "custom_phone_number": to,
        "phone_number": to,
        "user_uuid": user_uuid,
        "tenant_uuid": tenant_uuid,
        "lead_management_uuid": new_lead_uuid,
        "lead_status": '3809f32d-9096-406b-b2ff-1207b3fbfbc5'
      };
      await this.lead_management.insertMany(insert_lead_mgmt_string);
      console.log("Inserted new lead management document");
      const first_name = "Anonymous";
      const last_name = "";
      name = `${first_name} ${last_name}`;
      lead_management = new_lead_uuid;
    }
    // console.log( "Lead Management UUID====", lead_management_document.lead_management_uuid );

    try {
      const imageUrls = [];
      const documentUrls = [];
      let messageIds = [];
      let message_id = '';
      // Upload images
      if (image_url && image_url.length > 0) {
        for (const file of image_url) {
          // const imageUrl = `https://lab.belsmart.io:5011/send/${encodeURIComponent( file.filename )}`;
          const imageUrl = `${process.env.DOCUMENT_IMAGES_URL}send/${encodeURIComponent(file.filename)}`;
          imageUrls.push(imageUrl);

          // Send image message
          const response = await axios.post(apiUrl, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'image',
            image: { link: imageUrl }
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.data.messages && response.data.messages[0].id) {
            messageIds.push(response.data.messages[0].id);
          }
        }
      }

      // Upload documents
      if (document_url && document_url.length > 0) {
        for (const file of document_url) {
          // const documentUrl = `https://lab.belsmart.io:5011/send/${encodeURIComponent( file.filename )}`;
          const documentUrl = `${process.env.DOCUMENT_IMAGES_URL}send/${encodeURIComponent(file.filename)}`;
          documentUrls.push(documentUrl);

          // Send document message
          const response = await axios.post(apiUrl, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'document',
            document: { link: documentUrl, filename: file.originalname }
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.data.messages && response.data.messages[0].id) {
            messageIds.push(response.data.messages[0].id);
          }
        }
      }

      // let message_id = '';
      let templateUsed = null;
      // Send text message if text_content is present
      if (text_content) {
        const response = await axios.post(apiUrl, {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: text_content }
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        message_id = response.data.messages[0].id;
      } else if (template_name && template_language_code) {
        // Send template message
        const response = await axios.post(apiUrl, {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: template_name,
            language: {
              code: template_language_code
            }
          }
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log("response.data", response.data);
        message_id = response.data.messages[0].id;
        templateUsed = helloWorldTemplate;
      }
      if (messageIds.length > 0) {
        message_id = messageIds.join(', ');  // Combine all message IDs
      }
      // Prepare the message object for logging and response
      const messageObject = {
        from_number: from_number,
        to: to,
        message_id: message_id,
        user_uuid: user_uuid,
        tenant_uuid: tenant_uuid,
        messaging_channel_uuid: messaging_channel_id,
        // phone_number_id: phone_number_id,
        phone_number_id: resolved_phone_number_id,
        message_type: '0', // sent
        timestamp: timestamp,
        lead_management_uuid: lead_management,
        name: name,
        type: 'whatsapp',
        text_content: text_content,
        image_url: imageUrls,
        document_url: documentUrls,
        // text_type: text_content ? 'text' : ( imageUrls.length > 0 ? 'image' : 'document' ), // determine based on content
        text_type: text_content ? 'text' : (imageUrls.length > 0 ? 'image' : (documentUrls.length > 0 ? 'document' : 'template')), // determine based on content
        notification_type: '0',
        unread_message: '1',
        template_name: templateUsed,
      };

      const responseWhatsappmessage = await this.commonDbFn.insert(this.whatsappmessage, messageObject, JSON.stringify(logMessages), true);
      return responseWhatsappmessage;
    } catch (error) {
      console.log("newerror", error);
      console.error('Failed to send WhatsApp message:', error.response ? error.response.data : error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  async all_whatsappmessage(queryParams) {
    console.log(queryParams);
    console.log("queryParams");
    const { phone_number_id, from_number, tenant_uuid } = queryParams;
    const user_uuid = queryParams.uuid;
    try {
      await this.whatsappmessage.updateMany(
        {
          tenant_uuid,
          user_uuid,
          phone_number_id,
          $or: [{ from_number: from_number }, { to: from_number }],
          unread_message: '1'
        },
        {
          $set: { unread_message: '0' }
        }
      ).exec();
      const result = await this.whatsappmessage.find({ tenant_uuid, user_uuid, phone_number_id, $or: [{ from_number: from_number }, { to: from_number }] }).exec();
      console.log(result);
      console.log("tttttt");
      // let result = await this.whatsappmessage.find( { $and: [ { phone_number_id, from_number } ] } ).limit( 150 ).exec();
      let statusCode = result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
      return this.commonDbFn.sendResponseWithMessage(statusCode, result);

    } catch (error) {
      Logger.error(`Unable to fetch  WhatsApp`);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Unable to fetch WhatsApp");
    }
  }

  async unreadsection(queryParams) {
    console.log(queryParams);
    console.log("queryParams");
    const { campaign_uuid, token } = queryParams;
    const user_uuid = queryParams.uuid;
    console.log(user_uuid);
    const tenant_uuid = queryParams.tenant_uuid;
    console.log(tenant_uuid);
    let unreadResponse = {};
    let activeResponse = {};
    // try {
    if (campaign_uuid) {
      const blendedCampaign = await this.blended_campaign.find({ uuid: campaign_uuid }).exec();
      console.log(blendedCampaign);
      if (blendedCampaign.length > 0) {
        const allowedMessagingQueue = Array.isArray(blendedCampaign[0].allowed_messaging_queue) ?
          blendedCampaign[0].allowed_messaging_queue.map((item: any) => item.uuid) : [];
        console.log(allowedMessagingQueue);
        console.log("====allowedMessagingQueue");
        // const allowedMessagingQueue = blendedCampaign.allowed_messaging_queue;
        const messagingQueue: any[] = await this.messaging_queue.find({ type: '0', uuid: { $in: allowedMessagingQueue } }).exec();
        console.log(messagingQueue);
        console.log("----messagingQueue---");
        for (const queue of messagingQueue) {
          const messaging_queue_channel = queue.messaging_queue_channel;
          console.log(messaging_queue_channel);
          console.log("====messaging_queue_channel");
          if (messaging_queue_channel && messaging_queue_channel.WhatsApp) {
            const whatsappChannels = messaging_queue_channel.WhatsApp;
            console.log(whatsappChannels);
            console.log("====WhatsApp Channels");
            const messagingChannel: any = await this.messaging_channel.find({ type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
            console.log(messagingChannel);
            console.log("=====messagingChannel");
            if (messagingChannel && messagingChannel.length > 0) {
              const phoneNumbers: string[] = [];
              for (const channel of messagingChannel) {
                const customFields = channel.customFields as { phone_number_id: string };
                console.log(customFields);
                console.log("customFields");
                let phone_number_id = customFields.phone_number_id;
                console.log(phone_number_id);
                console.log("phone_number_id");
                if (phone_number_id) {
                  phoneNumbers.push(phone_number_id);
                }
              }
              console.log(phoneNumbers);
              console.log("phoneNumbers");
              const whatsappmessage = await this.whatsappmessage.aggregate([
                {
                  $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: "" } // Filter documents where user_uuid is empty
                },
                {
                  $sort: { timestamp: -1 } // Sort messages by timestamp in descending order before grouping
                },
                {
                  $group: {
                    _id: "$from_number",
                    latest_message: { $first: "$$ROOT" } // Keep only the first (latest) message in each group
                  }
                },
                {
                  $sort: { "latest_message.timestamp": -1 } // Sort messages by timestamp in descending order after grouping
                },
                // {
                //   $limit: 10 // Limit the results to one document, which will be the group with the latest message
                // }
              ]).exec();
              console.log(whatsappmessage);
              if (whatsappmessage && whatsappmessage.length > 0) {
                unreadResponse = {
                  unread: whatsappmessage
                };
              }
            } else {
              Logger.error(`WhatsApp messaging channel not found for the specified tenant and type`);
            }
          }
        }
      }
    } else {
      const agent_login_data = await this.user.find({ uuid: user_uuid }).exec();
      console.log(agent_login_data);
      if (agent_login_data.length > 0) {
        const defaultExtension = agent_login_data[0].default_extension;
        const messagingQueue: any[] = await this.messaging_queue.find({ tenant_uuid: tenant_uuid, type: '1' }).exec();
        console.log(messagingQueue);
        console.log("----messagingQueue---");
        let hasInserted = false;
        for (const queue of messagingQueue) {
          if (hasInserted) {
            break; // Exit the loop if insertion has already occurred
          }
          const messagingQueueExtensions = queue.messaging_queue_extensions;
          console.log(messagingQueueExtensions);
          console.log("====messagingQueueExtensions");
          const messaging_queue_channel = queue.messaging_queue_channel;
          console.log(messaging_queue_channel);
          console.log("====messaging_queue_channel");
          const whatsappChannels = messaging_queue_channel.WhatsApp;
          console.log(whatsappChannels);
          console.log("====WhatsApp Channels");
          if (messagingQueueExtensions && messagingQueueExtensions.length > 0) {
            // const defaultExtension = agent_login_data.default_extension;
            const isExtensionMatched = messagingQueueExtensions.includes(defaultExtension);
            console.log(isExtensionMatched);
            console.log("isExtensionMatched====");
            if (isExtensionMatched) {
              const messagingChannel: any = await this.messaging_channel.find({ tenant_uuid: tenant_uuid, type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
              console.log(messagingChannel);
              console.log("=====messagingChannel");
              if (messagingChannel && messagingChannel.length > 0) {
                const phoneNumbers: string[] = [];
                for (const channel of messagingChannel) {
                  const customFields = channel.customFields as { phone_number_id: string };
                  console.log(customFields);
                  console.log("customFields");
                  let phone_number_id = customFields.phone_number_id;
                  console.log(phone_number_id);
                  console.log("phone_number_id");
                  if (phone_number_id) {
                    phoneNumbers.push(phone_number_id);
                  }
                }
                console.log(phoneNumbers);
                console.log("phoneNumbers");
                const whatsappmessage = await this.whatsappmessage.aggregate([
                  {
                    $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: "" } // Filter documents where user_uuid is empty
                  },
                  {
                    $sort: { timestamp: -1 } // Sort messages by timestamp in descending order before grouping
                  },
                  {
                    $group: {
                      _id: "$from_number",
                      latest_message: { $first: "$$ROOT" } // Keep only the first (latest) message in each group
                    }
                  },
                  {
                    $sort: { "latest_message.timestamp": -1 } // Sort messages by timestamp in descending order after grouping
                  },
                  // {
                  //   $limit: 10 // Limit the results to one document, which will be the group with the latest message
                  // }
                ]).exec();
                console.log(whatsappmessage);
                if (whatsappmessage && whatsappmessage.length > 0) {
                  unreadResponse = {
                    unread: whatsappmessage
                  };
                }
              } else {
                Logger.error(`WhatsApp messaging channel not found for the specified tenant and type`);
              }
            }
          }
        }
      }
    }
    //============================active========================================
    if (campaign_uuid) {
      const blendedCampaign = await this.blended_campaign.find({ uuid: campaign_uuid }).exec();
      console.log(blendedCampaign);
      if (blendedCampaign.length > 0) {
        const allowedMessagingQueue = Array.isArray(blendedCampaign[0].allowed_messaging_queue) ?
          blendedCampaign[0].allowed_messaging_queue.map((item: any) => item.uuid) : [];
        console.log(allowedMessagingQueue);
        console.log("====allowedMessagingQueue");
        // const allowedMessagingQueue = blendedCampaign.allowed_messaging_queue;
        const messagingQueue: any[] = await this.messaging_queue.find({ tenant_uuid: tenant_uuid, type: '0', uuid: { $in: allowedMessagingQueue } }).exec();
        console.log(messagingQueue);
        console.log("----messagingQueue---");
        let hasInserted = false;
        for (const queue of messagingQueue) {
          if (hasInserted) {
            break; // Exit the loop if insertion has already occurred
          }
          const messaging_queue_channel = queue.messaging_queue_channel;
          console.log(messaging_queue_channel);
          console.log("====messaging_queue_channel");
          if (messaging_queue_channel && messaging_queue_channel.WhatsApp) {
            // const defaultExtension = agent_login_data.default_extension;
            const whatsappChannels = messaging_queue_channel.WhatsApp;
            console.log(whatsappChannels);
            console.log("====WhatsApp Channels");

            const messagingChannel: any = await this.messaging_channel.find({ tenant_uuid: tenant_uuid, type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
            console.log(messagingChannel);
            console.log("=====messagingChannel");
            if (messagingChannel && messagingChannel.length > 0) {
              const phoneNumbers: string[] = [];
              for (const channel of messagingChannel) {
                const customFields = channel.customFields as { phone_number_id: string }; // Access the customFields object
                console.log(customFields);
                console.log("customFields");
                let phone_number_id = customFields.phone_number_id;
                console.log(phone_number_id);
                console.log("phone_number_id");
                if (phone_number_id) {
                  phoneNumbers.push(phone_number_id);
                }
              }
              console.log(phoneNumbers);
              console.log("phoneNumbers");


              const whatsappmessage_active = await this.whatsappmessage.aggregate([
                {
                  // $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: user_uuid, message_type: '1' }
                  $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: user_uuid }
                },
                {
                  $sort: { createdAt: -1 } // Sort messages by timestamp in descending order before grouping
                  // $sort: { timestamp: -1 } // Sort messages by timestamp in descending order before grouping
                },
                {
                  $group: {
                    // _id: "$from_number",
                    _id: {
                      lead_management_uuid: "$lead_management_uuid",
                      contact: {
                        $cond: {
                          if: { $eq: ["$message_type", "0"] },
                          then: "$to",
                          else: "$from_number"
                        }
                      }
                    },
                    latest_message: { $first: "$$ROOT" },// Keep only the first (latest) message in each group
                    // unread_message_count: { $sum: { $toInt: { $ifNull: ["$unread_message", 0] } } } // Sum the unread messages
                    unread_message_count: {
                      $sum: {
                        $convert: {
                          input: { $ifNull: ["$unread_message", 0] },
                          to: "int",
                          onError: 0,
                          onNull: 0
                        }
                      }
                    }
                  }
                },
                {
                  $sort: { "latest_message.timestamp": -1 } // Sort messages by timestamp in descending order after grouping
                },
                // {
                //   $limit: 10 // Limit the results to one document, which will be the group with the latest message
                // }
              ]).exec();

              console.log(whatsappmessage_active);
              console.log("whatsappmessage_active");
              if (whatsappmessage_active && whatsappmessage_active.length > 0) {
                activeResponse = {
                  //   active: whatsappmessage_active

                  active: whatsappmessage_active.map(chat => ({
                    ...chat,
                    unread_message_count: chat.unread_message_count
                  }))
                };
              }

            }
          }
        }
      }
    } else {
      const agent_login_data = await this.user.find({ uuid: user_uuid }).exec();
      console.log(agent_login_data);
      if (agent_login_data.length > 0) {
        const defaultExtension = agent_login_data[0].default_extension;
        const messagingQueue: any[] = await this.messaging_queue.find({ tenant_uuid: tenant_uuid, type: '1' }).exec();
        console.log(messagingQueue);
        console.log("----messagingQueue---");
        let hasInserted = false;
        for (const queue of messagingQueue) {
          if (hasInserted) {
            break; // Exit the loop if insertion has already occurred
          }
          const messagingQueueExtensions = queue.messaging_queue_extensions;
          console.log(messagingQueueExtensions);
          console.log("====messagingQueueExtensions");
          const messaging_queue_channel = queue.messaging_queue_channel;
          console.log(messaging_queue_channel);
          console.log("====messaging_queue_channel");
          const whatsappChannels = messaging_queue_channel.WhatsApp;
          console.log(whatsappChannels);
          console.log("====WhatsApp Channels");
          if (messagingQueueExtensions && messagingQueueExtensions.length > 0) {
            // const defaultExtension = agent_login_data.default_extension;
            const isExtensionMatched = messagingQueueExtensions.includes(defaultExtension);
            console.log(isExtensionMatched);
            console.log("isExtensionMatched====");
            if (isExtensionMatched) {
              const messagingChannel: any = await this.messaging_channel.find({ tenant_uuid: tenant_uuid, type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
              console.log(messagingChannel);
              console.log("=====messagingChannel");
              if (messagingChannel && messagingChannel.length > 0) {
                const phoneNumbers: string[] = [];
                for (const channel of messagingChannel) {
                  const customFields = channel.customFields as { phone_number_id: string }; // Access the customFields object
                  console.log(customFields);
                  console.log("customFields");
                  let phone_number_id = customFields.phone_number_id;
                  console.log(phone_number_id);
                  console.log("phone_number_id");
                  if (phone_number_id) {
                    phoneNumbers.push(phone_number_id);
                  }
                }
                console.log(phoneNumbers);
                console.log("phoneNumbers");

                const whatsappmessage_active = await this.whatsappmessage.aggregate([
                  {
                    // $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: user_uuid, message_type: '1' }
                    $match: { phone_number_id: { $in: phoneNumbers }, user_uuid: user_uuid }
                  },
                  {
                    $sort: { timestamp: -1 } // Sort messages by timestamp in descending order before grouping
                  },
                  {
                    $group: {
                      // _id: "$from_number",
                      _id: {
                        lead_management_uuid: "$lead_management_uuid",
                        contact: {
                          $cond: {
                            if: { $eq: ["$message_type", "0"] },
                            then: "$to",
                            else: "$from_number"
                          }
                        }
                      },
                      latest_message: { $first: "$$ROOT" }, // Keep only the first (latest) message in each group
                      // unread_message_count: { $sum: { $toInt: { $ifNull: ["$unread_message", 0] } } } // Sum the unread messages
                      unread_message_count: {
                        $sum: {
                          $convert: {
                            input: { $ifNull: ["$unread_message", 0] },
                            to: "int",
                            onError: 0,
                            onNull: 0
                          }
                        }
                      }
                    }
                  },
                  {
                    $sort: { "latest_message.timestamp": -1 } // Sort messages by timestamp in descending order after grouping
                  },
                  // {
                  //   $limit: 10 // Limit the results to one document, which will be the group with the latest message
                  // }
                ]).exec();
                console.log(whatsappmessage_active);
                console.log("whatsappmessage_active");
                if (whatsappmessage_active && whatsappmessage_active.length > 0) {
                  activeResponse = {
                    //   active: whatsappmessage_active

                    active: whatsappmessage_active.map(chat => ({
                      ...chat,
                      unread_message_count: chat.unread_message_count
                    }))
                  };
                }
              }
            }
          }
        }
      }
    }
    const response = {
      ...unreadResponse,
      ...activeResponse
    };
    // Log the response
    console.log(response);
    let statusCode = response ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return this.commonDbFn.sendResponseWithMessage(statusCode, response);
    // } catch ( error ) {
    //   Logger.error( `Unable to fetch  WhatsApp data` );
    //   return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "Unable to fetch WhatsApp data" );
    // }
  }

  async select_queue(queryParam) {
    console.log(queryParam);
    const { tenant_uuid } = queryParam;

    let campaigns = await this.blended_campaign.find({ tenant_uuid }, { allowed_messaging_queue: 1, createdAt: 1, }).exec();
    console.log("interesting ");
    console.log(campaigns,);
    console.log("campaigns");
    const allowedMessagingQueues = campaigns.flatMap(campaign => campaign.allowed_messaging_queue || []);
    console.log(allowedMessagingQueues);
    console.log("allowedMessagingQueues");
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, allowedMessagingQueues);
  }

  async messaging_queue_channel(queryParam) {
    console.log(queryParam);

    const { tenant_uuid, messaging_queue_uuid } = queryParam;
    // const { messaging_queue_uuid } = queryParam;
    try {
      // Fetch the messaging queue for the given tenant UUID
      const messagingQueue = await this.messaging_queue.find({ tenant_uuid, uuid: messaging_queue_uuid }).exec();
      console.log(messagingQueue);
      console.log("----messagingQueue---");

      // Extract WhatsApp channel UUIDs from the messaging queue
      const whatsappChannels = messagingQueue.reduce((acc: string[], curr: any) => {
        if (curr.messaging_queue_channel && curr.messaging_queue_channel.WhatsApp) {
          return [...acc, ...curr.messaging_queue_channel.WhatsApp];
        } else {
          return acc;
        }
      }, []);

      console.log(whatsappChannels);
      console.log("====messaging_queue_channel");

      // Remove duplicate UUIDs
      const whatsappChannelsUnique = Array.from(new Set(whatsappChannels));

      console.log(whatsappChannelsUnique);
      console.log("====WhatsApp Channels");

      // Fetch the channel details for the unique UUIDs
      const channelDetails = await this.messaging_channel.find({
        uuid: { $in: whatsappChannelsUnique }
      }, { name: 1, uuid: 1, 'customFields.phone_number_id': 1 }).exec();

      console.log(channelDetails);
      console.log("====channelDetails");

      // Create a map of UUIDs to their names and phone_number_id
      const channelDataMap = channelDetails.reduce((acc: any, curr: any) => {
        acc[curr.uuid] = {
          name: curr.name,
          phone_number_id: curr.customFields?.phone_number_id ?? null
        };
        return acc;
      }, {});

      console.log(channelDataMap);
      console.log("====channelDataMap");

      // Format the data
      const data = whatsappChannelsUnique.map((channelUUID: string) => {
        const channelData = channelDataMap[channelUUID];
        return { uuid: channelUUID, name: channelData.name ?? "", phone_number_id: channelData.phone_number_id ?? null };
      });

      console.log(data);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, data);
    } catch (error) {
      console.error("Error fetching messaging queue channels:", error);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, "Error fetching messaging queue channels");
    }
  }

}
