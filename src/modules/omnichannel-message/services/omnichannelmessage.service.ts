import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { OmnichannelmessageDocument, OmnichannelmessageSchema } from "../schema/omnichannelmessage.schema";
import { OmnichannelsyncDocument, OmnichannelsyncSchema } from "../../omnichannel-sync/schema/omnichannelsync.schema";
import { MessagingChannelDocument, MessagingChannelSchema } from "../../messaging-channel/schema/messaging-channel.schema";
// import { SocketService } from "../../websockets/websockets.gateway";
import { InstagramProviderService } from "../../omnichannel-sync/providers/instagram-provider.service";
import { WhatsappProviderService } from "src/modules/omnichannel-sync/providers/whatsapp-provider.service";
import { IChannelProvider } from "../../omnichannel-sync/providers/channel-provider.interface";
import { CreateWhatsappmessageDto } from "src/modules/whatsapp-message/dto/create-whatsappmessage.dto";
import axios from "axios";
import { randomUUID } from "crypto";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { OmniChannelmessageDto } from "../dto/omnichannelmessage.dto";
import { FacebookProviderService } from "src/modules/omnichannel-sync/providers/facebook-provider.service";
import { OmniChannelReportDocument, OmniChannelReportSchema } from "src/modules/omni-channel-report/schema/omni-channel-report.schema";

@Injectable()
export class OmnichannelmessageService {
    private providers: Map<string, IChannelProvider> = new Map();

    constructor(
        @InjectModel(OmnichannelmessageSchema.name)
        private readonly omnichannel_message: Model<OmnichannelmessageDocument>,
        @InjectModel(OmniChannelReportSchema.name)
        private readonly omnichannel_report: Model<OmniChannelReportDocument>,
        @InjectModel(OmnichannelsyncSchema.name)
        private readonly omnichannel_sync: Model<OmnichannelsyncDocument>,
        @InjectModel(MessagingChannelSchema.name)
        private readonly messaging_channel: Model<MessagingChannelDocument>,
        private readonly instagramProvider: InstagramProviderService,
        private readonly whatsappProvider: WhatsappProviderService,
        private readonly facebookProvider: FacebookProviderService,
        // private readonly socketService: SocketService,
        private readonly commonDbFn: CommonDBFunctions,
        @InjectModel(LeadManagementSchema.name)
        private readonly lead_management: Model<LeadManagementDocument>,

        // lead_management
    ) {
        // Register channel providers
        this.providers.set('instagram', this.instagramProvider);
        this.providers.set('WhatsApp', this.whatsappProvider);
        this.providers.set('facebook', this.facebookProvider);
    }

    // Send Message Logic
    async sendMessage(
        channel_type: string,
        dto: OmniChannelmessageDto,       // same DTO reused
        image_url: Express.Multer.File[],
        document_url: Express.Multer.File[]
    ) {
        const { to, text_content, tenant_uuid, user_uuid, phone_number_id, campaign_uuid } = dto;

        console.log("PayloadPayloadPayload:", dto);
        console.log("PayloadPayloadPayload: mediaaaaa", image_url, document_url);

        // -----------------------------------------------------
        // 1 — FIND CHANNEL (WhatsApp OR Instagram OR Facebook)
        // -----------------------------------------------------
        const {
            channelType,
            accessToken,
            from_number,
            resolvedIdentifier,
            messaging_channel_id,
            channel_identifiers
        } = await this.findMessagingChannel(
            tenant_uuid,
            phone_number_id,
            channel_type   // ==> "WhatsApp" or "Instagram" or "facebook"
        );
        console.log("messaging channel foundd", resolvedIdentifier)

        // -----------------------------------------------------
        // 2 — FETCH / CREATE LEAD MANAGEMENT (pending for insta and facebook)
        // -----------------------------------------------------
        let lead_management_uuid, name;
        if (channelType) {
            const leadsResult = await this.resolveLeadManagement(tenant_uuid, user_uuid, to);
            lead_management_uuid = leadsResult.lead_management_uuid;
            name = leadsResult.name
        }
        else {
            console.log("No leads inserted")
        }

        // -----------------------------------------------------
        // 3 — CHECK IF THIS IS FIRST AGENT MESSAGE
        // -----------------------------------------------------
        const isFirstMessage = !(await this.omnichannel_message.exists({
            tenant_uuid,
            to,
            channelType
        }));

        await this.upsertOmnichannelSync({
            tenant_uuid,
            from_number: Array.isArray(from_number)
                ? from_number[0]
                : from_number,
            channel_type,
            channel_identifiers: this.buildChannelIdentifiers(
                channel_type,
                Array.isArray(resolvedIdentifier) ? resolvedIdentifier[0] : resolvedIdentifier
            ),
            user_uuid,
            browserToken: ""
        });

        // -----------------------------------------------------
        // 4 — SEND MESSAGE BASED ON CHANNEL (WA / IG / FB)
        // -----------------------------------------------------
        const { message_id, imageUrls, documentUrls } =
            await this.sendChannelContent({
                to,
                text_content,
                accessToken,
                channelType,
                resolvedIdentifier,
                images: image_url,
                docs: document_url
            });
        console.log("Message to wp/insta send succedssfillty")

        // -----------------------------------------------------
        // 5 — INSERT INTO OMNI CHANNEL REPORT (ONLY FIRST MESSAGE)
        // -----------------------------------------------------
        if (isFirstMessage) {
            await this.omnichannel_report.create({
                tenant_uuid,
                user_uuid,
                lead_management_uuid,
                campaign_uuid: campaign_uuid || null,
                channel_type: channelType,
                phone_number: to,
            });

            console.log("Omni channel report inserted (first message)");
        }

        // -----------------------------------------------------
        // 6 — SAVE IN DB
        // -----------------------------------------------------
        return await this.saveOmnichannelMessage({
            message_id,
            to,
            from_number,
            tenant_uuid,
            user_uuid,
            messaging_channel_id,
            resolvedIdentifier,
            lead_management_uuid,
            name,
            text_content,
            imageUrls,
            documentUrls,
            channelType,
            channel_identifiers
        });
    }

    async buildChannelIdentifiers(
        channel_type: string,
        resolvedIdentifier: string
    ) {
        switch (channel_type) {
            case 'facebook':
                return { facebook_page_id: resolvedIdentifier };

            case 'instagram':
                return { instagram_business_account_id: resolvedIdentifier };

            case 'whatsapp':
                return { phone_number_id: resolvedIdentifier };

            default:
                throw new Error(`Unsupported channel type: ${channel_type}`);
        }
    }


    async upsertOmnichannelSync(data: {
        tenant_uuid: string;
        from_number: string;
        channel_type: string;
        channel_identifiers: any;
        user_uuid?: string;
        browserToken?: string;
    }) {
        const filter: any = {
            tenant_uuid: data.tenant_uuid,
            from_number: data.from_number,
            channel_type: data.channel_type
        };

        if (data.channel_type === "instagram") {
            filter["channel_identifiers.instagram_business_account_id"] =
                data.channel_identifiers.instagram_business_account_id;
        }

        if (data.channel_type === "facebook") {
            filter["channel_identifiers.page_id"] =
                data.channel_identifiers.page_id;
        }

        if (data.channel_type === "WhatsApp") {
            filter["channel_identifiers.phone_number_id"] =
                data.channel_identifiers.phone_number_id;
        }

        const result = await this.omnichannel_sync.findOneAndUpdate(
            filter,
            {
                $setOnInsert: {
                    ...data,
                    status: "active"
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        return result;
    }


    private async findMessagingChannel(tenant_uuid: string, phone_number_id?: string, channel_type?: string) {
        const query: any = { tenant_uuid, type: channel_type };

        let projection: any = {
            "customFields.token": 1,
            uuid: 1
        };

        if (channel_type === "WhatsApp") {
            projection["customFields.phone_number_id"] = 1;
            projection["customFields.from_number"] = 1;
            projection["customFields.whatsapp_business_account_id"] = 1;
        }

        if (channel_type === "instagram") {
            projection["customFields.instagram_page_id"] = 1;
            projection["customFields.instagram_business_account_id"] = 1;
        }

        if (channel_type === "facebook") {
            projection["customFields.facebook_page_id"] = 1;
        }

        const channels = await this.messaging_channel.find(query, projection).exec();
        if (!channels?.length) throw new Error("Channel Not Found");

        const custom = channels[0].customFields;
        console.log("dasdsaadwqcscdc custommmmm", custom);

        return {
            channelType: channel_type,
            accessToken: custom.token,
            from_number: custom.from_number || custom.instagram_business_account_id,
            resolvedIdentifier:
                channel_type === "WhatsApp"
                    ? custom.phone_number_id
                    : channel_type === "instagram" ? custom.instagram_business_account_id
                        : custom.facebook_page_id,
            messaging_channel_id: channels[0].uuid,

            channel_identifiers: {
                phone_number_id: custom?.phone_number_id,
                instagram_page_id: custom?.instagram_page_id,
                instagram_business_account_id: custom?.instagram_business_account_id,
                from_number: custom?.from_number,
                facebook_page_id: custom?.facebook_page_id
            }
        };
    }

    private async resolveLeadManagement(tenant_uuid, user_uuid, to) {
        const existingLead = await this.lead_management
            .findOne({
                tenant_uuid,
                user_uuid,
                $or: [{ custom_phone_number: to }, { phone_number: to }]
            })
            .sort({ timestamp: 1 })
            .limit(1)
            .exec();

        if (existingLead) {
            const first = existingLead.first_name || "";
            const last = existingLead.last_name || "";
            return {
                lead_management_uuid: existingLead.lead_management_uuid,
                name: `${first} ${last}`.trim()
            };
        }

        // Create new lead
        const new_uuid = randomUUID();
        await this.lead_management.insertMany({
            first_name: "Anonymous",
            last_name: "",
            custom_phone_number: to,
            phone_number: to,
            tenant_uuid,
            user_uuid,
            lead_management_uuid: new_uuid,
            lead_status: "3809f32d-9096-406b-b2ff-1207b3fbfbc5",
            created_flag: "2"
        });

        return {
            lead_management_uuid: new_uuid,
            name: "Anonymous"
        };
    }

    private async saveOmnichannelMessage(data) {
        const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
        console.log("isnideee save omni chanel message in db", data);

        const messageObject = {
            from_number: data.from_number,
            to: data.to,
            message_id: data.message_id,
            user_uuid: data.user_uuid,
            tenant_uuid: data.tenant_uuid,
            messaging_channel_uuid: data.messaging_channel_id,
            phone_number_id: data.channelType == "WhatsApp" ? data.resolvedIdentifier : "",
            timestamp,
            lead_management_uuid: data.lead_management_uuid,
            name: data.name || "Annonymous",
            type: data.channelType,
            text_content: data.text_content,
            image_url: data.imageUrls,
            document_url: data.documentUrls,
            text_type: this.detectType(data),
            message_type: "0",
            unread_message: "0",
            status: "send",
            direction: "outbound",
            notification_type: "0",
            channel_type: data.channelType,
            channel_identifiers: data.channel_identifiers
        };

        return this.commonDbFn.insert(
            this.omnichannel_message,
            messageObject,
            JSON.stringify({
                logErrorMsg: `${data.channelType} message already exists`,
                logSuccessMsg: `${data.channelType} message created successfully`
            }),
            true
        );
    }


    private detectType(data) {
        if (data.text_content) return "text";
        if (data.imageUrls.length) return "image";
        if (data.documentUrls.length) return "document";
        return "template";
    }

    private async sendChannelContent({
        to,
        text_content,
        accessToken,
        channelType,
        resolvedIdentifier,
        images,
        docs
    }) {
        let apiUrl = "";
        let payload: any = {};
        let imageUrls: string[] = [];
        let documentUrls: string[] = [];
        console.log("inside sendChannelContent", to, text_content, resolvedIdentifier, channelType)

        if (channelType === "WhatsApp") {
            apiUrl = `https://graph.facebook.com/v22.0/${resolvedIdentifier}/messages`;
            payload.messaging_product = "whatsapp";
            payload.to = to;
        }

        if (channelType === "instagram") {
            apiUrl = `https://graph.instagram.com/v22.0/${resolvedIdentifier}/messages`;
            payload.messaging_type = "RESPONSE";
            payload.recipient = { id: to }; // IG user ID
            // payload.recipient = JSON.stringify({ id: to }); // IG user ID
        }

        if (channelType === "facebook") {
            apiUrl = `https://graph.facebook.com/v22.0/${resolvedIdentifier}/messages`;
            payload.messaging_type = "RESPONSE";
            payload.recipient = { id: to };; // FB page ID
            // payload.recipient = JSON.stringify({ id: to }); // FB page ID
        }

        // ==============================
        // PRIORITY 1 — TEXT
        // ==============================
        if (text_content) {
            if (channelType === "WhatsApp") {
                payload.type = "text";
                payload.text = { body: text_content };
            } else {
                payload.message = { text: text_content };
            }
        }

        // ==============================
        // PRIORITY 2 — IMAGE
        // ==============================
        else if (images.length) {
            const img = images[0];

            if (!["image/jpeg", "image/png", "image/jpg"].includes(img.mimetype)) {
                throw new Error("Invalid image type");
            }

            const link = `${process.env.DOCUMENT_IMAGES_URL}send/${encodeURIComponent(img.filename)}`;
            imageUrls.push(link);

            if (channelType === "WhatsApp") {
                payload.type = "image";
                payload.image = { link };
            } else {
                payload.message = {
                    attachment: {
                        type: "image",
                        payload: { url: link, is_reusable: true }
                    }
                };
            }
        }

        // ==============================
        // PRIORITY 3 — DOCUMENT (PDF)
        // ==============================
        else if (docs.length) {
            const doc = docs[0];

            if (doc.mimetype !== "application/pdf") {
                throw new Error("Only PDF documents are allowed");
            }

            const link = `${process.env.DOCUMENT_IMAGES_URL}send/${encodeURIComponent(doc.filename)}`;
            documentUrls.push(link);

            // 🔹 WhatsApp supports documents
            if (channelType === "WhatsApp") {
                payload.type = "document";
                payload.document = {
                    link,
                    filename: doc.originalname
                };
            }

            // 🔹 Facebook supports file attachment
            else if (channelType === "facebook") {
                payload.message = {
                    attachment: {
                        type: "file",
                        payload: {
                            url: link,
                            is_reusable: true
                        }
                    }
                };
            }

            // 🔹 Instagram DOES NOT support documents → send link as text
            else if (channelType === "instagram") {
                payload.message = {
                    text: `📄 Download document:\n${link}`
                };
            }
        }

        console.log("payloadpayload", payload);
        console.log(
            '📤 FB Payload:',
            JSON.stringify(payload, null, 2)
        );

        // ==============================
        // SEND MESSAGE
        // ==============================
        const res = await axios.post(apiUrl, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        return {
            message_id:
                res.data?.messages?.[0]?.id ||
                res.data?.message_id ||
                null,
            imageUrls,
            documentUrls
        };
    }

    async all_whatsappmessage(queryParams) {
        console.log(queryParams);
        console.log("queryParams");
        const { phone_number_id, from_number, tenant_uuid, channel_type, instagram_business_account_id, facebook_page_id } = queryParams;
        const user_uuid = queryParams.uuid;
        try {
            await this.omnichannel_message.updateMany(
                {
                    tenant_uuid,
                    user_uuid,
                    $and: [
                        {
                            $or: [
                                { "channel_identifiers.phone_number_id": phone_number_id },
                                { "channel_identifiers.instagram_business_account_id": instagram_business_account_id },
                                { "channel_identifiers.facebook_page_id": facebook_page_id }
                            ]
                        },
                        {
                            $or: [
                                { from_number: from_number },
                                { to: from_number }
                            ]
                        }
                    ],
                    unread_message: '1',
                    channel_type: channel_type
                },
                {
                    $set: { unread_message: '0' }
                }
            ).exec();
            const result = await this.omnichannel_message.find({
                tenant_uuid, user_uuid, channel_type: channel_type, $and: [
                    {
                        $or: [
                            { "channel_identifiers.phone_number_id": phone_number_id },
                            { "channel_identifiers.instagram_business_account_id": instagram_business_account_id },
                            { "channel_identifiers.facebook_page_id": facebook_page_id }
                        ]
                    },
                    {
                        $or: [
                            { from_number: from_number },
                            { to: from_number }
                        ]
                    }
                ]
            }).sort({ createdAt: 1 }).exec();
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

}