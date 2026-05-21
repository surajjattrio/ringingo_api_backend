import { Module } from '@nestjs/common';
import { AgentCallCenterController } from './controllers/agent-call-center.controller';
import { AgentCallCenterService } from './services/agent-call-center.service';
import { OutboundCampaignModule } from '../campaigns/outbound-campaign/outbound-campaign.module';
import { LeadGroupModule } from '../lead-group/lead-group.module';
import { NotesModule } from '../notes/notes.module';
import { LeadManagementModule } from '../lead-management/lead-management.module';
import { CdrsModule } from '../cdrs/cdrs.module';
import { WebhookModule } from '../webhook/webhook.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoCampaignOriginateSchema, autoCampaignOriginateSchema } from './schema/auto-campaign-originate.schema';
import { LeadOriginateSchema, leadOriginateSchema } from './schema/lead-originate.schema';
import { CallerIdSchema, callerIdSchema } from '../caller-id-group/schema/caller-ids.schema';
import { TrunkSchema, trunkSchema } from '../trunk/schema/trunk.schema';
import { AgentLoginLogoutSchema, agentLoginLogoutSchema } from './schema/agent-login-logout.schema';
import { AgentCampaignReportSchema, agentCampaignReportSchema } from './schema/agent-campaign-report.schema';
import { AgentLiveReportSchema, agentLiveReportSchema } from './schema/agent-live-report.schema';
import { InboundCampaignSchema, inboundCampaignSchema } from '../campaigns/inbound-campaign/schema/inbound-campaign.schema';
import { PredictiveCalculationSchema, predictiveCalculationSchema } from '../campaigns/inbound-campaign/schema/predictive-calculation.schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from '../campaigns/blended-campaign/schema/blended-campaign.schema';
import { DispositionSchema, dispositionSchema } from '../disposition/schema/disposition.schema';
import { LeadReportSchema, leadReportSchema } from './schema/lead-report.schema';
import { DncSchema, dncSchema } from '../dnc/schema/dnc.schema';
import { BreakcodeSchema, breakcodeSchema } from '../breakcode/schema/breakcode.schema';
import { CampaignStaticsSchema, campaignStaticsSchema } from './schema/campaign-statistics.schema';
import { InboundCustomerRingingSchema, inboundCustomerRingingSchema } from './schema/inbound-customer-ringing.schema';
import { OutboundCustomerRingingSchema, outboundCustomerRingingSchema } from './schema/outbound-customer-ringing.schema';
import { TenantSchema, tenantSchema } from '../tenant/schema/tenant.schema';
import { IdleStateAgentSchema, idleStateAgentSchema } from './schema/idle-state-agent.schema';
import { ManagerRoleSchema, managerRoleSchema } from '../manager-role/schema/manager-role.schema';
import { RinggroupSchema, ringgroupSchema } from '../ringgroup/schema/ringgroup.schema';
import { RealtimReportCountManagementSchema, realtimReportCountManagementSchema } from '../call-center/schema/realtime-report-count-management.schema';
import { RealtimReportInboundCountManagementSchema, realtimReportInboundCountManagementSchema } from '../call-center/schema/realtime-report-inbound-count-management.schema';
import { FollowUpSchema, followUpSchema } from "../follow-up/schema/follow-up.schema";
import { blockInboundCampaignSchema, BlockInboundCampaignSchema } from '../campaigns/block-inbound-campaign/schema/block-inbound-campaign.schema';
import { WebformSchema, webformSchema } from '../webform/schema/webform.schema';
import { whatsapp_available_agentSchema, Whatsapp_available_agentSchema } from '../agent/schema/whatsapp_available_agent.schema';
import { messagingchannelSchema, MessagingChannelSchema } from "../messaging-channel/schema/messaging-channel.schema";
import { messagingqueueSchema, MessagingQueueSchema } from "../messaging-queue/schema/messaging-queue.schema";
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { WhatsappmessageSchema, whatsappmessageSchema } from '../whatsapp-message/schema/whatsappmessage.schema';
import { ArcheiveWhatsappmessageSchema, archievewhatsappmessageSchema } from './schema/archieve_whatsapp_message.schema';
import { whatsappsyncSchema, WhatsappsyncSchema } from '../whatsapp-sync/schema/whatsappmsync.schema';
import { AgentCampaignLoginSchema, agentCampaignLoginSchema } from './schema/agent-campaign-login.schema';
import { ExtensionSchema, extensionSchema } from '../extension/schema/extension.schema';
import { SocketService } from '../websockets/websockets.gateway';
import { omnichannelsyncSchema, OmnichannelsyncSchema } from '../omnichannel-sync/schema/omnichannelsync.schema';
import { omnichannelmessageSchema, OmnichannelmessageSchema } from '../omnichannel-message/schema/omnichannelmessage.schema';
import { ArcheiveOmnichannelmessageSchema, archieveomnichannelmessageSchema } from './schema/archieve_omnichannel_message.schema';
import { omniChannelReportSchema, OmniChannelReportSchema } from '../omni-channel-report/schema/omni-channel-report.schema';
import { userRoleSchema, UserRoleSchema } from '../user-role/schema/user-role.schema';

@Module( {
        imports: [ OutboundCampaignModule, LeadGroupModule, NotesModule, LeadManagementModule, CdrsModule, WebhookModule,
                MongooseModule.forFeature( [
                        { name: AutoCampaignOriginateSchema.name, schema: autoCampaignOriginateSchema },
                        { name: LeadOriginateSchema.name, schema: leadOriginateSchema },
                        { name: CallerIdSchema.name, schema: callerIdSchema },
                        { name: TrunkSchema.name, schema: trunkSchema },
                        { name: AgentLoginLogoutSchema.name, schema: agentLoginLogoutSchema },
                        { name: AgentCampaignReportSchema.name, schema: agentCampaignReportSchema },
                        { name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
                        { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
                        { name: PredictiveCalculationSchema.name, schema: predictiveCalculationSchema },
                        { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
                        { name: DispositionSchema.name, schema: dispositionSchema },
                        { name: BreakcodeSchema.name, schema: breakcodeSchema },
                        { name: LeadReportSchema.name, schema: leadReportSchema },
                        { name: DncSchema.name, schema: dncSchema },
                        { name: CampaignStaticsSchema.name, schema: campaignStaticsSchema },
                        { name: InboundCustomerRingingSchema.name, schema: inboundCustomerRingingSchema },
                        { name: OutboundCustomerRingingSchema.name, schema: outboundCustomerRingingSchema },
                        { name: TenantSchema.name, schema: tenantSchema },
                        { name: IdleStateAgentSchema.name, schema: idleStateAgentSchema },
                        { name: ManagerRoleSchema.name, schema: managerRoleSchema },
                        { name: RinggroupSchema.name, schema: ringgroupSchema },
                        { name: RealtimReportCountManagementSchema.name, schema: realtimReportCountManagementSchema },
                        { name: RealtimReportInboundCountManagementSchema.name, schema: realtimReportInboundCountManagementSchema },
                        { name: FollowUpSchema.name, schema: followUpSchema },
                        { name: BlockInboundCampaignSchema.name, schema: blockInboundCampaignSchema },
                        { name: WebformSchema.name, schema: webformSchema },
                        { name: Whatsapp_available_agentSchema.name, schema: whatsapp_available_agentSchema },
                        { name: MessagingChannelSchema.name, schema: messagingchannelSchema },
                        { name: MessagingQueueSchema.name, schema: messagingqueueSchema },
                        { name: UserSchema.name, schema: userSchema },
                        { name: WhatsappmessageSchema.name, schema: whatsappmessageSchema },
                        { name: ArcheiveWhatsappmessageSchema.name, schema: archievewhatsappmessageSchema },
                        { name: ArcheiveOmnichannelmessageSchema.name, schema: archieveomnichannelmessageSchema },
                        { name: WhatsappsyncSchema.name, schema: whatsappsyncSchema },
                        { name: AgentCampaignLoginSchema.name, schema: agentCampaignLoginSchema },
                        { name: ExtensionSchema.name, schema: extensionSchema },
                        { name: OmnichannelsyncSchema.name, schema: omnichannelsyncSchema },
                        { name: OmnichannelmessageSchema.name, schema: omnichannelmessageSchema },
                        { name: OmniChannelReportSchema.name, schema: omniChannelReportSchema },
                        { name: UserRoleSchema.name, schema: userRoleSchema },
                ] )
        ],
        controllers: [ AgentCallCenterController ],
        providers: [ AgentCallCenterService, SocketService ]
} )
export class AgentCallCenterModule { }


