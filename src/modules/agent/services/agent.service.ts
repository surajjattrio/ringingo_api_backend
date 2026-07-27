import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { postMethod } from "src/global_constant";
import { JWTService } from "src/modules/auth/jwt.service";
import { CommonFunctions } from "src/modules/common/common_functions";
import { AgentDto } from "../dto/agent.dto";
import { AgentDocument, AgentSchema } from "../schema/agent.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { SipProfileDocument, SipProfileSchema } from "src/modules/sip-profile/schema/sip-profile-schema";
import { CheckLicenseService } from "src/modules/master-admin/services/check-license.service";
import { TimezoneDocument, TimezoneSchema } from "src/modules/timezone/schema/timezone.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { Whatsapp_available_agentDocument, Whatsapp_available_agentSchema } from 'src/modules/agent/schema/whatsapp_available_agent.schema';
import { MessagingChannelDocument, MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueDocument, MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";
import { ModechangeDocument, ModechangeSchema } from "src/modules/modechange/schema/modechange.schema";
import { WhatsappsyncDocument, WhatsappsyncSchema } from 'src/modules/whatsapp-sync/schema/whatsappmsync.schema';
import { InboundCampaignDocument, InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";

@Injectable()

export class AgentService {

    /*
    @Usage              : To load agent schema and other libraries
    @Param @InjectModel : It will load agent schema
    @Param commonFn     : To use common created function
    @return Object      : [agent,commonFn]
    */

    constructor(
        @InjectModel(AgentSchema.name) private readonly user: Model<AgentDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(SipProfileSchema.name) private readonly sip_profile: Model<SipProfileDocument>,
        @InjectModel(TimezoneSchema.name) private timezone: Model<TimezoneDocument>,
        @InjectModel(ManagerSchema.name) private manager: Model<ManagerDocument>,
        @InjectModel(Whatsapp_available_agentSchema.name) private whatsapp_available_agent: Model<Whatsapp_available_agentDocument>,
        @InjectModel(MessagingChannelSchema.name) private messaging_channel: Model<MessagingChannelDocument>,
        @InjectModel(MessagingQueueSchema.name) private messaging_queue: Model<MessagingQueueDocument>,
        @InjectModel(ModechangeSchema.name) private modechange: Model<ModechangeDocument>,
        @InjectModel(WhatsappsyncSchema.name) private whatsapp_sync: Model<WhatsappsyncDocument>,
        @InjectModel(InboundCampaignSchema.name) private inbound_campaign: Model<InboundCampaignDocument>,
        @InjectModel(OutboundCampaignSchema.name) private outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private blended_campaign: Model<BlendedCampaignDocument>,
        private readonly license: CheckLicenseService,
        private readonly commonFn: CommonFunctions,
        private readonly jwt: JWTService
    ) { }

    /*
    @Usage          : Login to agent and assing JWT.
    @Param username : Agent username
    @Param password : Agent password
    @return Object  : Success / Error
    */
    async getAgent(agentDto: AgentDto) {
        let agent: any, timezoneDetails, managerDetails;
        let { username, password, tenant_domain, company_code, device_id, callkit_token, apns_token, mobile_type, browserToken, campaign_uuid } = agentDto;
        
        // const commonDomain = process.env.COMMON_LOGIN_DOMAIN;
        let tenant_uuid: any;

        if (company_code) {
            tenant_uuid = await this.tenant.find({ company_code }, { uuid: 1, sip_profile_uuid: 1, status: 1, time_zone_uuid: 1, concurrent_calls: 1, _id: 0 }).exec();
            
            // If company_code is provided but no tenant found, throw specific error
            if (!tenant_uuid || tenant_uuid.length === 0) {
                Logger.error(`Invalid company code: ${company_code}`);
                throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Invalid Company Code" });
            }
        } 
        // else if (tenant_domain === commonDomain) {
        //     // Find agent by username globally to find their tenant
        //     const agentInfo = await this.user.findOne({ username }).exec();
        //     if (agentInfo) {
        //         tenant_uuid = await this.tenant.find({ uuid: agentInfo.tenant_uuid }, { uuid: 1, sip_profile_uuid: 1, status: 1, time_zone_uuid: 1, concurrent_calls: 1, _id: 0 }).exec();
        //     } else {
        //         throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Please enter valid credentials" });
        //     }
        // } 
        else {
            tenant_uuid = await this.tenant.find({ domain: tenant_domain }, { uuid: 1, sip_profile_uuid: 1, status: 1, time_zone_uuid: 1, concurrent_calls: 1, _id: 0 }).exec();
        }
        let timezoneUUID = tenant_uuid[0]?.time_zone_uuid;
        let ccCalls = tenant_uuid[0]?.concurrent_calls;

        //Check domain exist or not (only for domain-based login)
        if (!company_code && tenant_uuid.length == 0) {
            Logger.error(`Please enter valid domain`);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Please enter valid domain" });
        }

        //Check tenant status is active or not
        if (tenant_uuid[0].status == "1") {
            Logger.error(`Tenant with uuid : ${tenant_uuid[0].uuid} has status inactive`);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Your account is Inactive/Deleted! Please contact to the administrator" });
        }

        let sipProfileUUID = tenant_uuid[0]?.sip_profile_uuid;
        let populateFiled = [{ path: "agent_permission", select: "name status pbx_mode call_center_mode call_report login_logout_report recording follow_up sticky_agent number_masking settings breakcode whatsapp instagram facebook sms unallocated_leads agent_script auto_logout idle_timeout callqueue_selection" }, { path: "extension_details", select: "username password recording caller_id_number -_id uuid" }, { path: "tenant", select: "domain -_id -uuid" }]; // yaksh

        let where = [{ username }, { tenant_uuid: tenant_uuid[0]?.uuid }];
        agent = await this.user.findOne({ $and: where }, { username: 1, uuid: 1, email: 1, password: 1, user_role: 1, user_role_uuid: 1, tenant_uuid: 1, campaign_uuid: 1, default_extension: 1, is_logged_in: 1, is_logged_in_mobile: 1, recording: 1, browserToken: 1, status: 1, manager_uuid: 1, omni_messaging_channel_uuid: 1 }).populate(populateFiled).exec();

        if (agent == null) {
            Logger.error(`User not found by username : ${username} \n`, postMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Please enter valid credentials" })
        }
        console.log(`🔍 LOGIN ATTEMPT: User ${agent.username} - user_role_uuid: ${agent.user_role_uuid ? 'EXISTS (AGENT)' : 'NOT FOUND (TENANT)'}`);

        //Check user status is active or not
        if (agent.status == "1") {
            Logger.error(`Your account is Inactive/Deleted! Please contact to the administrator \n`); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Your account is Inactive/Deleted! Please contact to the administrator" })
        }

        //Restrict user to login if user does not have any extension.
        if (agent.default_extension == "" || agent.default_extension == undefined) {
            Logger.error(`Extension not assigned to username : ${username} due to that logged in failed \n`, postMethod); throw new NotFoundException({ statusCode: HttpStatus.FORBIDDEN, message: "There is a configuration error, Please contact to administrator" });
        }

        //Restrict user to login if both PBX and call center mode permission disable.
        if (agent.agent_permission[0].pbx_mode == "1" && agent.agent_permission[0].call_center_mode == "1") {
            Logger.error(`User role not assigned to username : ${username} \n`, postMethod); throw new NotFoundException({ statusCode: HttpStatus.FORBIDDEN, message: "You don't have enough permission to login" });
        }

        //For WEB : Restrict user to login if that user is already logged in into another device.
        if (device_id == undefined) {
               if (agent.is_logged_in == "0") {
             Logger.error(`User : ${username} is logged in into another device \n`, postMethod);
             return {
                 statusCode: HttpStatus.FORBIDDEN,
                 data: `Current user is already logged in into another device`
             }
         }
        }

        //For MOBILE : Restrict user to login if that user is already logged in into another device.
        if (device_id != "" && device_id != undefined) {
            if (agent.is_logged_in_mobile == "0") {
                Logger.error(`User : ${username} is logged in into another device \n`, postMethod);
                return {
                    statusCode: HttpStatus.FORBIDDEN,
                    message: `Current user is already logged in into another device`
                }
            }
        }
        let decryptPassword = this.commonFn.decode(agent.password);
        if (decryptPassword === password) {

            //Check admin has added license or not
            let result: any = await this.licenseExist();
            if (result.statusCode == 403) { return result; }
            if (!result) {
                return {
                    statusCode: HttpStatus.FORBIDDEN,
                    data: "Access not permitted. Please contact the administrator.",
                };
            }

            Logger.debug(`Agent logged in successfully with uuid : ${agent.uuid} \n`, postMethod);
            Logger.debug(`DATA : ${browserToken}\n`);
console.log("Device",device_id)
console.log("agentttttttt",agent)
            if (device_id == undefined) { // For Web
                if (agent.user_role_uuid != "") {
                    console.log(`🟢 AGENT LOGIN (Web): Updating campaign_uuid for agent ${agent.username} with campaign_uuid: ${campaign_uuid}`);
                    await this.user.updateOne({ uuid: agent.uuid }, { is_logged_in: 0, browserToken: browserToken, campaign_uuid: campaign_uuid });
                } else {
                    console.log(`🔴 TENANT LOGIN (Web): Skipping campaign_uuid update for tenant ${agent.username}`);
                    await this.user.updateOne({ uuid: agent.uuid }, { is_logged_in: 0, browserToken: browserToken });
                }
            }

            if (device_id != "" && device_id != undefined) { // For Mobile
                await this.user.updateOne({ uuid: agent.uuid }, { is_logged_in_mobile: 0, device_id: device_id, callkit_token, apns_token, mobile_type, campaign_uuid: campaign_uuid });
            }

            //Get sip port
            let sip_port = await this.sip_profile.find({ uuid: sipProfileUUID }, { sip_port: 1, _id: 0 }).exec();

            if (agent?.extension_details[0]?.password != undefined) {
                let decodeExtensionPassword = this.commonFn.decode(agent?.extension_details[0]?.password);
                agent.extension_details[0].password = decodeExtensionPassword;
            }

            //Add domain in agent token
            let domain = agent?.tenant[0]?.domain;

            //Add timezone name in user object
            try {
                timezoneDetails = await this.timezone.findOne({ uuid: timezoneUUID }, { timezone_name: 1, _id: 0 }).exec();
            } catch (error) {
                Logger.error(`Timezone not found for user`, error.message);
            }

            const { uuid, tenant_uuid } = agent
            agent.password = decryptPassword;
            let role = "agent";

            //Fetch manager role based on manager_uuid
            if (agent?.manager_uuid) {
                managerDetails = await this.manager.findOne({ uuid: agent.manager_uuid }, { _id: 0, manager_role_uuid: 1 });
            }
            // Update the agent's campaign_uuid in database
           if ( agent.user_role_uuid ) {
                            console.log(`🟢 AGENT LOGIN: Additional campaign_uuid update for agent ${agent.username} with campaign_uuid: ${campaign_uuid}`);

                await this.user.updateOne(
                    { uuid: agent.uuid },
                    { $set: { campaign_uuid: campaign_uuid } }
                );
            }
            console.log("Agent", agent);
            console.log("managerD", managerDetails);
            console.log("token", this.jwt.generateToken({ username, role, uuid, tenant_uuid, domain, timezone: timezoneDetails.timezone_name, concurrent_calls: ccCalls, manager_uuid: agent?.manager_uuid, assigned_manager_role: managerDetails?.manager_role_uuid, campaign_uuid: campaign_uuid }));
            await this.whatsapp_available_agent.deleteMany({ user_uuid: uuid, tenant_uuid: tenant_uuid }).exec();
            //whatsapp
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
                    const defaultExtension = agent.default_extension;
                    const isExtensionMatched = messagingQueueExtensions.includes(defaultExtension);
                    console.log(isExtensionMatched);
                    console.log("isExtensionMatched====");

                    if (isExtensionMatched) {
                        const messagingChannel: any = await this.messaging_channel.find({ tenant_uuid: tenant_uuid, type: 'WhatsApp', uuid: { $in: whatsappChannels } }).exec();
                        console.log(messagingChannel);
                        console.log("=====messagingChannel");
                        if (messagingChannel && messagingChannel.length > 0) {
                            for (const channel of messagingChannel) {
                                const customFields = channel.customFields as { phone_number_id: string }; // Access the customFields object
                                if (customFields) {
                                    const whatsappAvailableAgentData = [{
                                        phone_number_id: customFields.phone_number_id,
                                        tenant_uuid: tenant_uuid,
                                        user_uuid: agent.uuid,
                                        browserToken: agent.browserToken,
                                        type: 1 //pbx
                                    }];
                                    console.log(whatsappAvailableAgentData);
                                    console.log("whatsappAvailableAgentData");
                                    // Insert data for whatsapp_available_agent
                                    await this.whatsapp_available_agent.insertMany(whatsappAvailableAgentData);
                                }
                                // Find and update the browserToken in whatsapp_sync collection
                                const filter = {
                                    phone_number_id: customFields.phone_number_id,
                                    user_uuid: agent.uuid,
                                    tenant_uuid: tenant_uuid,
                                    type: 1 //pbx
                                };
                                const update = {
                                    $set: { browserToken: agent.browserToken }
                                };

                                const result = await this.whatsapp_sync.updateMany(filter, update);
                                console.log(result);
                                console.log("whatsapp_sync updated");
                                hasInserted = true;
                            }
                        } else {
                            // Handle the case where messagingChannel is empty
                            Logger.error(`WhatsApp messaging channel not found for the specified tenant and type`);
                            // Throw an exception or handle it as per your application's requirement
                        }
                    }
                }
            }

            try {
                // Extracting necessary data from the response
                const { call_center_mode, pbx_mode, uuid } = agent;
                // Creating the modechange entry
                const modeChangeData = {
                    status: call_center_mode === '0' ? '0' : '1', // If call_center_mode is '0', set status to '0', otherwise set it to '1'
                    user_uuid: uuid,
                    tenant_uuid: tenant_uuid,
                };
                console.log(modeChangeData);
                console.log("modeChangeData");
                await this.modechange.create(modeChangeData);
            } catch (error) {
                Logger.error(`Error occurred while inserting modechange entry: ${error}`);
            }
            //whatsapp
            return {
                statusCode: HttpStatus.OK,
                data: "Logged in successfully",
                role: role,
                sip_port: sip_port[0]?.sip_port,
                access_token: this.jwt.generateToken({
                    username, role, uuid, tenant_uuid, domain, timezone: timezoneDetails.timezone_name, concurrent_calls: ccCalls, manager_uuid: agent?.manager_uuid, assigned_manager_role: managerDetails?.manager_role_uuid, campaign_uuid: campaign_uuid
                }),
                agent_detail: {
                    ...agent.toObject(),
                    campaign_uuid: campaign_uuid,
                    ...(await (async () => {
                        if (campaign_uuid) {
                            let campaign: any = await this.inbound_campaign.findOne({ uuid: campaign_uuid }).exec();
                            if (!campaign) {
                                campaign = await this.outbound_campaign.findOne({ uuid: campaign_uuid }).exec();
                            }
                            if (!campaign) {
                                campaign = await this.blended_campaign.findOne({ uuid: campaign_uuid }).exec();
                            }
                            if (campaign) {
                                return {
                                    auto_answer: campaign.auto_answer ?? "1", 
                                    agent_script: campaign.agent_script ?? "1",
                                    agent_script_text: campaign.agent_script_text ?? ""
                                };

                            }
                        }
                        return {};
                    })())
                }
            };

        } else {
            Logger.error(`Incorrect agent password \n`, postMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Please enter valid credentials" })
        }
    }

    /*
    @Usage : To check license exist and status active or not
    */

    async licenseExist() {
        let response = await this.license.checkLicenseExist();
        if (response == false) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                data: "Access not permitted. Please contact the administrator.",
            };
        }

        //Check license status
        let result = await this.commonFn.licenseCheck(
            response,
            "",
            this.license,
            "agent"
        );
        return result;
    }
}
