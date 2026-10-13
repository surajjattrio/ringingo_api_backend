import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TenantModule } from "./modules/tenant/tenant.module";
import { MasterAdminModule } from "./modules/master-admin/master-admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommonModule } from "./modules/common/common.module";
import { TimezoneModule } from "./modules/timezone/timezone.module";
import { ExtensionModule } from "./modules/extension/extension.module";
import { RolesModule } from "./modules/roles/roles.module";
import { LoggerMiddleware } from "./middlewares/logger.middleware";
import { SipProfileModule } from "./modules/sip-profile/sip-profile.module";
import { TimeconditionModule } from "./modules/timecondition/timecondition.module";
import { CountryModule } from "./modules/country/country.module";
import { GreetingModule } from "./modules/greeting/greeting.module";
import { DidModule } from "./modules/did/did.module";
import { TrunkModule } from "./modules/trunk/trunk.module";
import { UserModule } from "./modules/user/user.module";
import { AgentModule } from "./modules/agent/agent.module";
import { UserRoleModule } from "./modules/user-role/user-role.module";
import { ConferenceModule } from "./modules/conference/conference.module";
import { CallQueueModule } from "./modules/call-queue/call-queue.module";
import { FeatureCodeModule } from "./modules/feature-code/feature-code.module";
import { IvrModule } from "./modules/ivr/ivr.module";
import { BreakcodeModule } from "./modules/breakcode/breakcode.module";
import { RinggroupModule } from "./modules/ringgroup/ringgroup.module";
import { UserGroupModule } from "./modules/user-group/user-group.module";
import { CdrsModule } from "./modules/cdrs/cdrs.module";
import { LeadManagementModule } from "./modules/lead-management/lead-management.module";
import { VoicemailModule } from "./modules/voicemail/voicemail.module";
import { RecordingsModule } from "./modules/recordings/recordings.module";
import { OutgoingRulesModule } from "./modules/outgoing-rules/outgoing-rules.module";
import { LiveCallsModule } from "./modules/live-calls/live-calls.module";
import { NotesModule } from "./modules/notes/notes.module";
import { MailConfigurationModule } from "./modules/mail-configuration/mail-configuration.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { ProfileModule } from "./modules/profile/profile.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { IpMappingModule } from "./modules/ip-mapping/ip-mapping.module";
import { LeadGroupModule } from "./modules/lead-group/lead-group.module";
import { CallerIdGroupModule } from "./modules/caller-id-group/caller-id-group.module";
import { DispositionModule } from "./modules/disposition/disposition.module";
import { KanbanModule } from "./modules/kanban/kanban.module";
import { OutboundCampaignModule } from "./modules/campaigns/outbound-campaign/outbound-campaign.module";
import { AgentCallCenterModule } from "./modules/call-center/agent-call-center.module";
import { InboundCampaignModule } from "./modules/campaigns/inbound-campaign/inbound-campaign.module";
import { FollowUpModule } from "./modules/follow-up/follow-up.module";
import { BlendedCampaignModule } from "./modules/campaigns/blended-campaign/blended-campaign.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { StickyAgentModule } from "./modules/sticky-agent/sticky-agent.module";
import { DncModule } from "./modules/dnc/dnc.module";
import { AdminDidModule } from "./modules/admin-did/admin-did.module";
import { AdminIpMappingModule } from "./modules/admin-ip-mapping/admin-ip-mapping.module";
import { ScheduleModule } from "@nestjs/schedule";
import { CronModule } from "./modules/cron/cron.module";
import { BlockInboundCampaignModule } from "./modules/campaigns/block-inbound-campaign/block-inbound-campaign.module";
import { ClickToCallModule } from "./modules/click-to-call/click-to-call.module";
import { CtcModule } from "./modules/ctc/ctc.module";
import { WebsocketsModule } from "./modules/websockets/websockets.module";
import { VoiceBroadcastModule } from "./modules/voice-broadcast/voice-broadcast.module";
import { UserPerformanseReportModule } from "./modules/user-performance-report/user-performance-report.module";
import { LeadreportModule } from "./modules/lead-report/lead-report.module";
import { TenantreportModule } from "./modules/tenant-report/tenant-report.module";
import { CampaignreportModule } from "./modules/campaign-report/campaign-report.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { ManualDialModule } from "./modules/manual-dial/manual-dial.module";
import { VoicebroadcastdetailsModule } from "./modules/voicebroadcast-details/voicebroadcast-details.module";
import { ManagerModule } from "./modules/manager/manager.module";
import { ManagerRoleModule } from "./modules/manager-role/manager-role.module";
import { MissedcallreportModule } from "./modules/missed-call-report/missed-call-report.module";
import { LoginlogoutreportModule } from "./modules/login-logout-report/login-logout-report.module";
import { TelecomCircleModule } from "./modules/telecom-circle/telecom-circle.module";
import { PbxLeadStatusModule } from "./modules/pbx-lead-status/pbx-lead-status.module";
import { ZohocrmModule } from "./modules/zohocrm/zohocrm.module";
import { PresetModule } from "./modules/campaigns/preset/preset.module";
import { MessagingChannelModule } from "./modules/messaging-channel/messaging-channel.module";
import { MessagingQueueModule } from "./modules/messaging-queue/messaging-queue.module";
import { WebformModule } from "./modules/webform/webform.module";
import { CustomFieldsModule } from "./modules/custom-field/custom-field-module";
import { WhatsappmessageModule } from "./modules/whatsapp-message/whatsappmessage.module";
import { ModechangeModule } from "./modules/modechange/modechange.module";
import { WhatsappsyncModule } from "./modules/whatsapp-sync/whatsappsync.module";
import { StickyAgentReportModule } from "./modules/sticky-agent-report/sticky-agent-report.module";
import { FtpModule } from "./modules/ftp/ftp.module";
import { StateModule } from "./modules/state/state.module";
import { AreaCodeModule } from "./modules/area-code/area-code.module";
import { CallQueueReportModule } from "./modules/call-queue-report/call-queue-report.module";
import { DroppedCallsReportModule } from "./modules/dropped-calls-report/dropped-calls-report.module";
import { OmnichannelmessageSchema } from "./modules/omnichannel-message/schema/omnichannelmessage.schema";
import { OmnichannelsyncModule } from "./modules/omnichannel-sync/omnichannelsync.module";
import { OmnichannelmessageModule } from "./modules/omnichannel-message/omnichannelmessage.module";
import { GoogleSheetModule } from "./modules/google-sheet/google-sheet.module";
import { OmniChannelReportModule } from "./modules/omni-channel-report/omnichannelReport.module";
import { RequestSchedulerModule } from "./modules/request-scheduler/request-scheduler.module";
import { GoogleDriveModule } from "./modules/google-drive/google-drive.module";
import { ActivityLogModule } from "./modules/activity-log/activity-log.module";
import { ActivityLogInterceptor } from "./interceptor/activity-log.interceptor";
import { WebhookModule } from "./modules/webhook/webhook.module";
import { CdrWebhookModule } from "./modules/cdr-webhook/cdr-webhook.module";
import { VoiceAlertModule } from "./modules/voice-alert/voice-alert.module";
import { RealtimeDashboardModule } from "./modules/realtime-dashboard/realtime-dashboard.module";
import { InboundCallDebugModule } from "./modules/inbound-call-debug/inbound-call-debug.module";
import { MailScheduleModule } from './modules/mail-schedule/mail-schedule.module';
import { EmailTemplateModule } from "./modules/email-template/email-template.module";
import { ApiConfigurationModule } from "./modules/api-configuration/api-configuration.module";
import { MessageConfigurationModule } from "./modules/message-configuration/message-configuration.module";
import { ApiKeyModule } from "./modules/api-key/api-key.module";
import { SystemMonitoringModule } from "./modules/system-monitoring/system-monitoring.module";
import { CallFeedbackModule } from "./modules/call-feedback/call-feedback.module";
import { SmsProviderConfigModule } from "./modules/sms-provider-config/sms-provider-config.module";
import { ServerSyncModule } from "./modules/server-sync/server-sync.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    MasterAdminModule,
    TenantModule,
    MongooseModule.forRoot(process.env.MONGO_URI),
    ActivityLogModule,
    CommonModule,
    ThrottlerModule.forRoot({
      ttl: parseInt(process.env.THROTTLE_TTL),
      limit: parseInt(process.env.THROTTLE_LIMIT),
    }),
    TimezoneModule,
    ExtensionModule,
    RolesModule,
    SipProfileModule,
    TimeconditionModule,
    CountryModule,
    GreetingModule,
    DidModule,
    TrunkModule,
    UserModule,
    AgentModule,
    UserRoleModule,
    ConferenceModule,
    CallQueueModule,
    FeatureCodeModule,
    IvrModule,
    RinggroupModule,
    UserGroupModule,
    CdrsModule,
    LeadManagementModule,
    RecordingsModule,
    OutgoingRulesModule,
    VoicemailModule,
    LiveCallsModule,
    NotesModule,
    MailerModule,
    MailConfigurationModule,
    ProfileModule,
    DashboardModule,
    IpMappingModule,
    LeadGroupModule,
    CallerIdGroupModule,
    DispositionModule,
    OutboundCampaignModule,
    AgentCallCenterModule,
    InboundCampaignModule,
    FollowUpModule,
    BlendedCampaignModule,
    NotificationModule,
    StickyAgentModule,
    DncModule,
    AdminDidModule,
    AdminIpMappingModule,
    ScheduleModule.forRoot(),
    CronModule,
    BlockInboundCampaignModule,
    ClickToCallModule,
    CtcModule,
    VoiceBroadcastModule,
    UserPerformanseReportModule,
    LeadreportModule,
    TenantreportModule,
    CampaignreportModule,
    MonitoringModule,
    ManualDialModule,
    VoicebroadcastdetailsModule,
    WebsocketsModule,
    ManagerModule,
    ManagerRoleModule,
    MissedcallreportModule,
    LoginlogoutreportModule,
    PbxLeadStatusModule,
    TelecomCircleModule,
    BreakcodeModule,
    ZohocrmModule,
    PresetModule,
    MessagingChannelModule,
    MessagingQueueModule,
    WebformModule,
    CustomFieldsModule,
    WhatsappmessageModule,
    ModechangeModule,
    WhatsappsyncModule,
    StickyAgentReportModule,
    FtpModule,
    StateModule,
    AreaCodeModule,
    CallQueueReportModule,
    DroppedCallsReportModule,
    OmnichannelsyncModule,
    OmnichannelmessageModule,
    GoogleSheetModule,
    OmniChannelReportModule,
    RequestSchedulerModule,
    GoogleDriveModule,
    WebhookModule,
    CdrWebhookModule,
    VoiceAlertModule,
    RealtimeDashboardModule,
    InboundCallDebugModule,
    EmailTemplateModule,
    ApiConfigurationModule,
    MessageConfigurationModule,
    MailScheduleModule,
    ApiKeyModule,
    KanbanModule,
    SystemMonitoringModule,
    CallFeedbackModule,
    SmsProviderConfigModule,
    ServerSyncModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // Default Enable For All Endpoints : If you want to disable rate-limiting on REST APIs on controller level or on route level you can check : https://docs.nestjs.com/security/rate-limiting
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
