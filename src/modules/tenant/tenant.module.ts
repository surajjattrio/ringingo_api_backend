import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule} from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import {
	sipProfileSchema,
	SipProfileSchema,
} from "../sip-profile/schema/sip-profile-schema";
import { rolesSchema, RolesSchema } from "../roles/schema/roles-schema";
import { trunkSchema, TrunkSchema } from "../trunk/schema/trunk.schema";
import { TenantController } from "./controllers/tenant.controller";
import { TenantSchema, tenantSchema } from "./schema/tenant.schema";
import { TenantService } from "./services/tenant.service";
import { TenantRabbitmqService } from "./services/tenant-rabbitmq.service";
import { FeatureCodeModule } from "../feature-code/feature-code.module";
import { OutgoingRulesModule } from "../outgoing-rules/outgoing-rules.module";
import { UserGroupModule } from "../user-group/user-group.module";
import { UserRoleModule } from "../user-role/user-role.module";
import {
	leadGroupSchema,
	LeadGroupSchema,
} from "../lead-group/schema/lead-group.schema";
import {
	agentLiveReportSchema,
	AgentLiveReportSchema,
} from "../call-center/schema/agent-live-report.schema";
import { DashboardModule } from "../dashboard/dashboard.module";
import {
	leadOriginateSchema,
	LeadOriginateSchema,
} from "../call-center/schema/lead-originate.schema";
import {
	leadsInQueueSchema,
	LeadsInQueueSchema,
} from "../lead-management/schema/leads-in-queue.schema";
import {
	CampaignStaticsSchema,
	campaignStaticsSchema,
} from "../call-center/schema/campaign-statistics.schema";
import {
	CallQueueSchema,
	callQueueSchema,
} from "../call-queue/schema/call-queue.schema";
import {
	OutboundCustomerWaitingSchema,
	outboundCustomerWaitingSchema,
} from "../call-center/schema/outbound-customer-waiting-count.schema";
import {
	InboundCustomerRingingSchema,
	inboundCustomerRingingSchema,
} from "../call-center/schema/inbound-customer-ringing.schema";
import {
	OutboundCustomerRingingSchema,
	outboundCustomerRingingSchema,
} from "../call-center/schema/outbound-customer-ringing.schema";
import {
	LeadManagementSchema,
	leadManagementSchema,
} from "../lead-management/schema/lead-management.schema";
import {
	RealtimReportCountManagementSchema,
	realtimReportCountManagementSchema,
} from "../call-center/schema/realtime-report-count-management.schema";
import {
	RealtimReportInboundCountManagementSchema,
	realtimReportInboundCountManagementSchema,
} from "../call-center/schema/realtime-report-inbound-count-management.schema";
import {
	OutboundCampaignSchema,
	outboundCampaignSchema,
} from "../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import {
	InboundCampaignSchema,
	inboundCampaignSchema,
} from "../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import {
	BlendedCampaignSchema,
	blendedCampaignSchema,
} from "../campaigns/blended-campaign/schema/blended-campaign.schema";
import {
	ManagerOutboundRealtimeReportSchema,
	managerOutboundRealtimeReportSchema,
} from "../call-center/schema/manager-outbound-report.schema";
import {
	ManagerInboundRealtimeReportSchema,
	managerInboundRealtimeReportSchema,
} from "../call-center/schema/manager-inbound-report.schema";
import {
	PbxLeadStatusSchema,
	pbxLeadStatusSchema,
} from "../pbx-lead-status/schema/pbx-lead-status.schema";
import {
	TenantPersonalizationSchema,
	tenantpersonalizationSchema,
} from "./schema/tenant-personalization.schema";
import { SocketService } from "../websockets/websockets.gateway";
import {
	WhatsappsyncSchema,
	whatsappsyncSchema,
} from "../whatsapp-sync/schema/whatsappmsync.schema";
import {
	WhatsappmessageSchema,
	whatsappmessageSchema,
} from "../whatsapp-message/schema/whatsappmessage.schema";
import {
	MessagingChannelSchema,
	messagingchannelSchema,
} from "../messaging-channel/schema/messaging-channel.schema";
import {
	Whatsapp_available_agentSchema,
	whatsapp_available_agentSchema,
} from "../agent/schema/whatsapp_available_agent.schema";
import { omnichannelmessageSchema, OmnichannelmessageSchema } from "../omnichannel-message/schema/omnichannelmessage.schema";
import { OmnichannelsyncSchema, omnichannelsyncSchema } from "../omnichannel-sync/schema/omnichannelsync.schema";
import { UserModule } from "../user/user.module";
@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: TenantSchema.name, schema: tenantSchema },
			{ name: SipProfileSchema.name, schema: sipProfileSchema },
			{ name: TrunkSchema.name, schema: trunkSchema },
			{ name: LeadGroupSchema.name, schema: leadGroupSchema },
			{ name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
			{ name: LeadOriginateSchema.name, schema: leadOriginateSchema },
			{ name: LeadsInQueueSchema.name, schema: leadsInQueueSchema },
			{ name: CampaignStaticsSchema.name, schema: campaignStaticsSchema },
			{ name: CallQueueSchema.name, schema: callQueueSchema },
			{
				name: OutboundCustomerWaitingSchema.name,
				schema: outboundCustomerWaitingSchema,
			},
			{
				name: InboundCustomerRingingSchema.name,
				schema: inboundCustomerRingingSchema,
			},
			{
				name: OutboundCustomerRingingSchema.name,
				schema: outboundCustomerRingingSchema,
			},
			{ name: LeadManagementSchema.name, schema: leadManagementSchema },
			{
				name: RealtimReportCountManagementSchema.name,
				schema: realtimReportCountManagementSchema,
			},
			{
				name: RealtimReportInboundCountManagementSchema.name,
				schema: realtimReportInboundCountManagementSchema,
			},
			{ name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
			{ name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
			{ name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
			{
				name: ManagerOutboundRealtimeReportSchema.name,
				schema: managerOutboundRealtimeReportSchema,
			},
			{
				name: ManagerInboundRealtimeReportSchema.name,
				schema: managerInboundRealtimeReportSchema,
			},
			{ name: PbxLeadStatusSchema.name, schema: pbxLeadStatusSchema },
			{
				name: TenantPersonalizationSchema.name,
				schema: tenantpersonalizationSchema,
			},
			{ name: WhatsappsyncSchema.name, schema: whatsappsyncSchema },
			{ name: WhatsappmessageSchema.name, schema: whatsappmessageSchema },
			{ name: OmnichannelmessageSchema.name, schema: omnichannelmessageSchema },
			{ name: OmnichannelsyncSchema.name, schema: omnichannelsyncSchema },
			{ name: MessagingChannelSchema.name, schema: messagingchannelSchema },
			{
				name: Whatsapp_available_agentSchema.name,
				schema: whatsapp_available_agentSchema,
			},
			{ name: RolesSchema.name, schema: rolesSchema },
		]),
		ConfigModule,
		HttpModule,
		FeatureCodeModule,
		OutgoingRulesModule,
		UserGroupModule,
		UserRoleModule,
		UserModule,
		forwardRef(() => DashboardModule),
	],
	controllers: [TenantController],
	providers: [TenantService, SocketService, TenantRabbitmqService],
	exports: [MongooseModule, TenantRabbitmqService],
})
export class TenantModule { }
