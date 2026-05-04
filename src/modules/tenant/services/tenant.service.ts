import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as esl from "modesl";
import { getMethod, putMethod } from 'src/global_constant';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { TenantSchema, TenantDocument } from '../schema/tenant.schema';
import { CommonFunctions } from 'src/modules/common/common_functions';
import { CommonDBFunctions } from 'src/modules/common/common_db_functions';
import { JWTService } from 'src/modules/auth/jwt.service';
import axios from 'axios';
import { SipProfileDocument, SipProfileSchema } from 'src/modules/sip-profile/schema/sip-profile-schema';
import { TrunkDocument, TrunkSchema } from 'src/modules/trunk/schema/trunk.schema';
import { FeatureCodeDocument, FeatureCodeSchema } from 'src/modules/feature-code/schema/feature-code.schema';
import { OutgoingRulesDocument, OutgoingRulesSchema } from 'src/modules/outgoing-rules/schema/outgoing-rules.schema';
import { CreateOutgoingRulesDto } from 'src/modules/outgoing-rules/dto/create-outgoing-rules.dto';
import { UserGroupDocument, UserGroupSchema } from 'src/modules/user-group/schema/user-group.schema';
import { CreateUserGroupDto } from 'src/modules/user-group/dto/create-user-group.dto';
import { CreateUserRoleDto } from 'src/modules/user-role/dto/create-user-role.dto';
import { UserRoleDocument, UserRoleSchema } from 'src/modules/user-role/schema/user-role.schema';
import { CreateLeadGroupDto } from 'src/modules/lead-group/dto/create-lead-group.dto';
import { LeadGroupDocument, LeadGroupSchema } from 'src/modules/lead-group/schema/lead-group.schema';
import { AgentLiveReportDocument, AgentLiveReportSchema } from 'src/modules/call-center/schema/agent-live-report.schema';
import { DashboardService } from 'src/modules/dashboard/services/dashboard.service';
import { LeadOriginateDocument, LeadOriginateSchema } from 'src/modules/call-center/schema/lead-originate.schema';
import { LeadsInQueueDocument, LeadsInQueueSchema } from 'src/modules/lead-management/schema/leads-in-queue.schema';
import { CampaignStaticsDocument, CampaignStaticsSchema } from 'src/modules/call-center/schema/campaign-statistics.schema';
import { CallQueueDocument, CallQueueSchema } from 'src/modules/call-queue/schema/call-queue.schema';
import { OutboundCustomerWaitingDocument, OutboundCustomerWaitingSchema } from 'src/modules/call-center/schema/outbound-customer-waiting-count.schema';
import { InboundCustomerRingingDocument, InboundCustomerRingingSchema } from 'src/modules/call-center/schema/inbound-customer-ringing.schema';
import { OutboundCustomerRingingSchema } from 'src/modules/call-center/schema/outbound-customer-ringing.schema';
import { LeadManagementDocument, LeadManagementSchema } from 'src/modules/lead-management/schema/lead-management.schema';
import { RealtimReportCountManagementDocument, RealtimReportCountManagementSchema } from 'src/modules/call-center/schema/realtime-report-count-management.schema';
import { RealtimReportInboundCountManagementDocument, RealtimReportInboundCountManagementSchema } from 'src/modules/call-center/schema/realtime-report-inbound-count-management.schema';
import { Cron } from '@nestjs/schedule';
import * as moment from "moment";
import { OutboundCampaignDocument, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { InboundCampaignDocument, InboundCampaignSchema } from 'src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema';
import { BlendedCampaignDocument, BlendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';
import { ManagerOutboundRealtimeReportDocument, ManagerOutboundRealtimeReportSchema } from 'src/modules/call-center/schema/manager-outbound-report.schema';
import { ManagerInboundRealtimeReportDocument, ManagerInboundRealtimeReportSchema } from 'src/modules/call-center/schema/manager-inbound-report.schema';
import { PbxLeadStatusDocument, PbxLeadStatusSchema } from 'src/modules/pbx-lead-status/schema/pbx-lead-status.schema';
import { TenantPersonalizationDocument, TenantPersonalizationSchema } from '../schema/tenant-personalization.schema';
import { TenantPersonalizationDto } from '../dto/tenant-personalization.dto';
import * as fs from "fs";
import { SocketService } from '../../websockets/websockets.gateway';
import { UserDocument, UserSchema } from 'src/modules/user/schema/user.schema';
import { TenantRabbitmqService } from './tenant-rabbitmq.service';
import { RolesDocument, RolesSchema } from 'src/modules/roles/schema/roles-schema';
@Injectable()
export class TenantService {

  /*
  @Usage              : To load tenant schema and other libraries
  @Param @InjectModel : It will load tenant schema
  @Param commonFn     : To use common created function
  @Param commonDbFn   : To use commonly created mongoDB functions
  @return Object      : [tenant,commonFn,commonDbFn]
  */

  constructor(
    @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
    private readonly commonFn: CommonFunctions,
    private readonly commonDbFn: CommonDBFunctions,
    private readonly socketService: SocketService,
    @InjectModel(SipProfileSchema.name) private readonly sip_profile: Model<SipProfileDocument>,
    @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
    @InjectModel(FeatureCodeSchema.name) private readonly feature_code: Model<FeatureCodeDocument>,
    @InjectModel(OutgoingRulesSchema.name) private readonly outgoing_rules: Model<OutgoingRulesDocument>,
    @InjectModel(UserGroupSchema.name) private readonly user_group: Model<UserGroupDocument>,
    @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
    @InjectModel(UserRoleSchema.name) private readonly user_role: Model<UserRoleDocument>,
    @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
    @InjectModel(AgentLiveReportSchema.name) private readonly agent_live_report: Model<AgentLiveReportDocument>,
    @InjectModel(LeadOriginateSchema.name) private readonly lead_originate: Model<LeadOriginateDocument>,
    @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
    @InjectModel(CampaignStaticsSchema.name) private readonly campaign_statistics: Model<CampaignStaticsDocument>,
    @InjectModel(CallQueueSchema.name) private readonly call_queue: Model<CallQueueDocument>,
    @InjectModel(OutboundCustomerWaitingSchema.name) private readonly outbound_customer_waiting_count: Model<OutboundCustomerWaitingDocument>,
    @InjectModel(InboundCustomerRingingSchema.name) private readonly inbound_customer_ringing: Model<InboundCustomerRingingDocument>,
    @InjectModel(OutboundCustomerRingingSchema.name) private readonly outbound_customer_ringing: Model<OutboundCustomerWaitingDocument>,
    @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
    @InjectModel(RealtimReportCountManagementSchema.name) private readonly realtime_report_count_management: Model<RealtimReportCountManagementDocument>,
    @InjectModel(RealtimReportInboundCountManagementSchema.name) private readonly realtime_report_inbound_count_management: Model<RealtimReportInboundCountManagementDocument>,
    @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
    @InjectModel(InboundCampaignSchema.name) private readonly inbound_campaign: Model<InboundCampaignDocument>,
    @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
    @InjectModel(ManagerOutboundRealtimeReportSchema.name) private readonly manager_outbound_report: Model<ManagerOutboundRealtimeReportDocument>,
    @InjectModel(ManagerInboundRealtimeReportSchema.name) private readonly manager_inbound_report: Model<ManagerInboundRealtimeReportDocument>,
    @InjectModel(PbxLeadStatusSchema.name) private readonly pbx_lead_status: Model<PbxLeadStatusDocument>,
    @InjectModel(TenantPersonalizationSchema.name) private readonly tenant_personalization: Model<TenantPersonalizationDocument>,
    private readonly jwt: JWTService,
    private readonly tenantRabbitmqService: TenantRabbitmqService,
    @InjectModel(RolesSchema.name) private readonly roles: Model<RolesDocument>,

  ) { }

  /*
  @Usage                 : First it will check whether given domain exist or not , if not then new tenant will be created else it will throw error
  @Param createTenantDto : Request paramter that we set into dto
  @return Object         : Success / Error
  */

  async create(createTenantDto: CreateTenantDto) {

    const { username, email, domain, account_code, outgoing_rule_uuid, company_code } = createTenantDto;
    if(company_code){
      createTenantDto.company_code = company_code.toLowerCase();
    }
     if (!createTenantDto.domain && createTenantDto.company_code) {
      createTenantDto.domain = `${createTenantDto.company_code}.ringingo.com`;
    }
    let where;
    if (account_code != "") {
      where = [{ username }, { email }, { domain }, { account_code }, { company_code: company_code.toLowerCase() }];
    } else {
      where = [{ username }, { email }, { domain }, { company_code: company_code.toLowerCase() }];
    }

    createTenantDto.password = this.commonFn.encode(createTenantDto.password);
    let logMessages = {
      logErrorMsg: "Tenant already exist \n",
      logSuccessMsg: "Tenant created successfully \n"
    }
    let response = await this.commonDbFn.findAndInsert(this.tenant, where, createTenantDto, JSON.stringify(logMessages), "or", true);

    if (response.statusCode == 409) { return response; }

    //Create feature code for recently created tenant
    this.addDefaultFeatureCodes(response.message?.uuid);

    //Create default outgoing rules
    this.addDefaultOutgoingRules(response.message?.uuid, outgoing_rule_uuid);

    //Create default role
    this.addDefaultRoleForTenant(response.message?.uuid);

    let sip_profile_uuid = createTenantDto.sip_profile_uuid;
    /*Create SIP Profile*/
    this.getDetailsToGenerateSipProfile(sip_profile_uuid);

    /*Create default Pbx lead status*/
    this.addDefaultPbxLeadStatus(response.message?.uuid);

    // Emit RabbitMQ event
    if (await this.checkWhatsappPermission(createTenantDto.role_uuid)) {
      this.tenantRabbitmqService.publish('tenant.created', { ...createTenantDto, uuid: response.message?.uuid });
    } else {
      Logger.debug(`Skipping RabbitMQ publish for tenant.created: WhatsApp permission not enabled for role ${createTenantDto.role_uuid}`);
    }

    delete response.message;
    return response;
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of tenants with data
  */

  async findAll(queryParams) {
    let searchFields = ["domain", "username", "tenant_name"];
    let populateFields = [{ path: "roles", select: "role_name" }, { path: "country", select: 'country nicename' }, { path: "timezone", select: 'timezone_name gmttime' }, { path: "outgoing_rule", select: 'name -_id -uuid' }];
    return this.commonDbFn.findAllWithPagination(this.tenant, queryParams, searchFields, populateFields);
  }

  /*
  @Usage          : To get single tenant record based on uuid
  @Param uuid     : Search tenant by uuid
  @return Object  : Result of tenant
  */

  async findOne(uuid: string) {
    const user = await this.tenant.findOne({ uuid }).exec();
    if (user == null) {
      Logger.error(`Tenant not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Tenant not found" })
    }
    Logger.debug(`Tenant success fetched by uuid : ${uuid} \n`);
    user.password = await this.commonFn.decode(user.password);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /*
  @Usage                     : Check domain which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update tenant by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error
  */

  async update(uuid: string, updateTenantDto: UpdateTenantDto) {

    if (updateTenantDto.domain) {
      updateTenantDto.domain = updateTenantDto.domain.toLowerCase();
    }

    const { domain, username, email, account_code, outgoing_rule_uuid } = updateTenantDto;
    const getTenantData = await this.tenant.findOne({ uuid }, { domain: 1, email: 1, username: 1, account_code: 1, company_code: 1, _id: 0 }).exec();

    //Check domain exist
    if (getTenantData?.domain != domain) {
      let result = await this.checkDuplicate(domain, "domain");
      if (result?.statusCode == 409) { return result };
    }

    //Check username exist
    if (getTenantData?.username != username) {
      let result = await this.checkDuplicate(username, "username");
      if (result?.statusCode == 409) { return result };
    }

    //Check email exist
    if (getTenantData?.email != email) {
      let result = await this.checkDuplicate(email, "email");
      if (result?.statusCode == 409) { return result };
    }

    if (getTenantData?.account_code != account_code && account_code != "") {
      let result = await this.checkDuplicate(account_code, "account_code");
      if (result?.statusCode == 409) { return result };
    }

    if (updateTenantDto.company_code && getTenantData?.company_code != updateTenantDto.company_code) {
      let result = await this.checkDuplicate(updateTenantDto.company_code, "company_code");
      if (result?.statusCode == 409) { return result };
    }

    updateTenantDto.password = this.commonFn.encode(updateTenantDto.password);
    let logMessages = {
      logErrorMsg: `Tenant not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Tenant updated successfully by uuid : ${uuid} \n`
    }
    let response = await this.commonDbFn.update(this.tenant, uuid, updateTenantDto, JSON.stringify(logMessages));

    if (response.statusCode == 404) { return response; }

    /*Create SIP Profile*/
    let sip_profile_uuid = updateTenantDto.sip_profile_uuid;
    this.getDetailsToGenerateSipProfile(sip_profile_uuid);

    //Update user group
    let body = { outbound_rule: outgoing_rule_uuid };
    let result = await this.user_group.updateOne({ tenant_uuid: uuid }, body).exec();
    if (result.matchedCount == 0 && result.modifiedCount == 0) {
      Logger.error(`${logMessages.logErrorMsg} \n`, putMethod);
    } else {
      Logger.debug(`User group updated successfully with : ${outgoing_rule_uuid} \n`, putMethod);
    }

    // Emit RabbitMQ event
    const tenantRoleUuid = updateTenantDto.role_uuid || getTenantData?.role_uuid;
    if (await this.checkWhatsappPermission(tenantRoleUuid)) {
      this.tenantRabbitmqService.publish('tenant.updated', { ...updateTenantDto, uuid });
    } else {
      Logger.debug(`Skipping RabbitMQ publish for tenant.updated: WhatsApp permission not enabled for role ${tenantRoleUuid}`);
    }

    return response;
  }

  /*
  @Usage         : Delete single or multiple tenant using uuid
  @Param uuid    : To delete single tenant pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error
  */

  async remove(uuid: string) {
    let logMessages = {
      logErrorMsg: `Tenant not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Tenant deleted successfully by uuid : ${uuid} \n`
    }

    // Fetch tenant data before deletion
    const getTenantData = await this.tenant.findOne({ uuid }, { role_uuid: 1, vendor_uid: 1, _id: 0 }).exec();

    this.getDetailsToGenerateSipProfile(uuid);

    const response = await this.commonDbFn.delete(this.tenant, { uuid }, JSON.stringify(logMessages));

    // Emit RabbitMQ event
    if (response.statusCode == 200) {
      if (await this.checkWhatsappPermission(getTenantData?.role_uuid)) {
        this.tenantRabbitmqService.publish('tenant.deleted', { uuid, vendor_uid: getTenantData?.vendor_uid });
      } else {
        Logger.debug(`Skipping RabbitMQ publish for tenant.deleted: WhatsApp permission not enabled for role ${getTenantData?.role_uuid}`);
      }
    }

    return response;
  }

  /*
  @Usage              : To search tenant using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of tenants with data
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "roles", select: "role_name" }, { path: "country", select: 'country nicename' }, { path: "timezone", select: 'timezone_name gmttime' }, { path: "outgoing_rule", select: 'name -_id -uuid' }];
    return this.commonDbFn.advancedSearch(this.tenant, searchParams, populateFields);
  }

  /*
  @Usage         : To update status of tenant[Active/Inactive]
  @Param uuid    : uuid of tenant
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `Tenant not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Tenant status updated successfully by uuid : ${uuid} \n`
    }

    // Fetch tenant data before update
    const getTenantData = await this.tenant.findOne({ uuid }, { role_uuid: 1, _id: 0 }).exec();

    const response = await this.commonDbFn.update(this.tenant, uuid, body, JSON.stringify(logMessages));

    // Emit RabbitMQ event
    if (response.statusCode == 200) {
      if (await this.checkWhatsappPermission(getTenantData?.role_uuid)) {
        this.tenantRabbitmqService.publish('tenant.updated', { ...body, uuid });
      } else {
        Logger.debug(`Skipping RabbitMQ publish for tenant.updated (patch): WhatsApp permission not enabled for role ${getTenantData?.role_uuid}`);
      }
    }

    return response;
  }

  /*
  @Usage         : To add default feature codes for tenant
  @return Object : Success / Error
  */

  async addDefaultFeatureCodes(lastInsertedUUID) {
    let obj = [
      {
        name: "call_forwarding_enable",
        display_name: "Call Forwarding Enable",
        description: "Call forwarding enable",
        feature_code: "*71",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "call_forwarding_disable",
        display_name: "Call Forwarding Disable",
        description: "Call forwarding disable",
        feature_code: "*72",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "call_forwarding_toggle",
        display_name: "Call Forwarding Toggle",
        description: "Call forwarding toggle",
        feature_code: "*73",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "on_busy_enable",
        display_name: "On Busy Enable",
        description: "On Busy enable",
        feature_code: "*74",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "on_busy_disable",
        display_name: "On Busy Disable",
        description: "On Busy disable",
        feature_code: "*75",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "on_busy_toggle",
        display_name: "On Busy Toggle",
        description: "On Busy toggle",
        feature_code: "*76",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "no_answered_enable",
        display_name: "No Answered Enable",
        description: "No Answered enable",
        feature_code: "*77",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "no_answered_disable",
        display_name: "No Answered Disable",
        description: "No Answered disable",
        feature_code: "*78",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "no_answered_toggle",
        display_name: "No Answered Toggle",
        description: "No Answered toggle",
        feature_code: "*79",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "not_registered_enable",
        display_name: "Not Register Enable",
        description: "Not Register enable",
        feature_code: "*80",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "not_registered_disable",
        display_name: "Not Register Disable",
        description: "Not Register disable",
        feature_code: "*81",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "not_registered_toggle",
        display_name: "Not Register Toggle",
        description: "Not Register toggle",
        feature_code: "*82",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "dnd_enable",
        display_name: "DND Enable",
        description: "DND enable",
        feature_code: "*83",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "dnd_disable",
        display_name: "DND Disable",
        description: "DND disable",
        feature_code: "*84",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "dnd_toggle",
        display_name: "DND Toggle",
        description: "DND toggle",
        feature_code: "*85",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "follow_me_enable",
        display_name: "Follow Me Enable",
        description: "Follow Me enable",
        feature_code: "*86",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "follow_me_disable",
        display_name: "Follow Me Disable",
        description: "Follow Me disable",
        feature_code: "*87",
        tenant_uuid: lastInsertedUUID
      },
      {
        name: "follow_me_toggle",
        display_name: "Follow Me Toggle",
        description: "Follow Me toggle",
        feature_code: "*88",
        tenant_uuid: lastInsertedUUID
      }
    ]
    await this.feature_code.insertMany(obj);
  }

  /*
  @Usage         : To add default outgoing rules for tenant
  @return Object : Success / Error
  */

  async addDefaultOutgoingRules(tenantUUID, outgoingRule) {
    let result, outgoingRuleUUID;
    if (outgoingRule == "") {
      const obj: CreateOutgoingRulesDto = {
        name: 'Default',
        description: 'Default rules',
        status: '0',
        tenant_uuid: tenantUUID,
        created_flag: "0",
        rules: [
          {
            length: '0',
            prefix: '*',
            strip: '',
            prepend: '',
            trunk_uuid: '',
            failover_trunk_1_uuid: '',
            failover_trunk_2_uuid: ''
          }
        ],
      };
      result = new this.outgoing_rules(obj);
      result = await result.save();
      outgoingRuleUUID = result.uuid;
      Logger.debug("Created default outgoing rule for tenant");
    } else {
      outgoingRuleUUID = outgoingRule;
    }

    //Create default user group
    this.addDefaultUserGroup(tenantUUID, outgoingRuleUUID);
  }

  /*
  @Usage         : To add user group for tenant
  @return Object : Success / Error
  */

  async addDefaultUserGroup(tenantUUID, outgoingRuleUUID) {
    const obj: CreateUserGroupDto = {
      name: 'Default',
      outbound_rule: outgoingRuleUUID,
      status: '0',
      tenant_uuid: tenantUUID,
      manager_uuid: "",
      role: ""
    }

    let result = new this.user_group(obj);
    result = await result.save();
    Logger.debug("Created default user group for tenant");

    //Create default lead group
    this.addDefaultLeadGroup(result, tenantUUID);
  }

  /*
  @Usage         : To add default role for tenant
  @return Object : Success / Error
  */

  async addDefaultRoleForTenant(tenantUUID) {
    const obj: CreateUserRoleDto = {
      name: 'Default',
      status: '0',
      pbx_mode: '1',
      call_center_mode: '0',
      call_report: '1',
      login_logout_report: '1',
      tenant_uuid: tenantUUID,
      recording: '0',
      sticky_agent: '1',
      number_masking: '1',
      follow_up: '1',
      settings: '1',
      breakcode: '1',
      manager_uuid: "",
      whatsapp: "1",
      instagram: "1",
      facebook: "1",
      sms: "1",
      role: "",
      unallocated_leads: "1",
      force_login: "1",
      agent_script: "1"
    }
    let result = new this.user_role(obj);
    result = await result.save();
    Logger.debug("Created default role for tenant");
  }
  /*
  @Usage                 : Common code to generate sip profile
  @Param sipProfileuuid  : Request paramter that we set into dto
  @return Object         : Success / Error
  */

  /*
  @Usage         : To add default lead group for tenant
  @return Object : Success / Error
  */

  async addDefaultLeadGroup(usergroup, tenantUUID) {
    const obj: CreateLeadGroupDto = {
      name: 'Default',
      status: '0',
      tenant_uuid: tenantUUID,
      user_group_uuid: usergroup.uuid,
      description: "",
      campaign_uuid: "",
      totalLeadCount: '0',
      manager_uuid: "",
      role: "",
      human_answer: '0',
      sale: '0',
      campaign_flag: "",
      webhook: false
    }
    let result = new this.lead_group(obj);
    result = await result.save();
    Logger.debug("Created default lead group for tenant");
  }

  async getDetailsToGenerateSipProfile(sip_profile_uuid) {
    //Fetch all tenant with this sip profile
    let allTenants = await this.tenant.find({ sip_profile_uuid }, { domain: 1, _id: 0 }).exec();

    //Fetch sip profile detail.
    let sipProfile = await this.sip_profile.find({ uuid: sip_profile_uuid }).exec();

    //Fetch all trunks correspondence to this sip profile
    let allTrunk = await this.trunk.find({ sip_profile_uuid }).exec();

    //Generate sip profile
    await this.commonFn.generateSipProfile(sipProfile[0], allTenants, allTrunk);

    //Reload sip profile
    await this.commonFn.rescanSipProfile(sipProfile[0]?.name);

    //Restart sip profile
    //await this.commonFn.restartSipProfile(sipProfile[0]?.name);
  }

  /*
  @Usage         : Login to tenant and assing JWT.
  @Param uuid    : uuid of tenant
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  async tenantLogin(tenant_uuid: string) {
    const tenant: any = await this.tenant.findOne({ uuid: tenant_uuid }, { tenant_name: 1, username: 1, domain: 1, email: 1, uuid: 1, roles: 1, role_uuid: 1, time_zone_uuid: 1 }).populate([{ path: "roles", select: "-_id" }, { path: "timezone", select: 'timezone_name' }]).exec();
    if (tenant == null) {
      Logger.error(`Tenant not found by uuid : ${tenant_uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Tenant not found" })
    }
    Logger.debug(`Tenant successfully Logged in by uuid : ${tenant_uuid} \n`);
    const { username, domain, email, uuid } = tenant;
    let role = "tenant";
    return {
      statusCode: HttpStatus.OK,
      data: "Logged in successfully",
      tenant_detail: tenant,
      role: role,
      access_token: this.jwt.generateToken({ username, domain, email, role, uuid, timezone: tenant.timezone[0]?.timezone_name })
    };
  }

  /*
  @Usage          : Check duplicate username,email,domain
  @Param value    : Contains domain/email/username any
  @return Object  : Success / Error
  */

  async checkDuplicate(value, fieldName) {
    let result;
    switch (fieldName) {
      case "domain":
        result = await this.tenant.find({ domain: value }).count().exec();
        break;
      case "username":
        result = await this.tenant.find({ username: value }).count().exec();
        break;
      case "email":
        result = await this.tenant.find({ email: value }).count().exec();
        break;
      case "account_code":
        result = await this.tenant.find({ account_code: value }).count().exec();
        break;
      case "company_code":
        result = await this.tenant.find({ company_code: value }).count().exec();
        break;
    }

    if (result > 0) {
      let errorMsg = fieldName.toString().charAt(0).toUpperCase() + fieldName.toString().slice(1);
      Logger.error(`${errorMsg} already exist \n`, putMethod);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `${errorMsg} already exist`);
    }
  }

  /*
  @Usage                : To add default Pbx lead status for tenant
  @return Object        : Success / Error
  */

  async addDefaultPbxLeadStatus(tenant_uuid) {
    let defaultStatus = ["NEW", "HIGH", "LOW", "SALE", "BUSY", "SURVEY"];
    let arrToInsert = [], i;
    defaultStatus.map((data) => {
      arrToInsert.push({ name: data, code: data, status: "0", tenant_uuid })
    })
    await this.pbx_lead_status.insertMany(arrToInsert, { ordered: false });
  }

  /*********************************** Agent's Realtime Report ***************************************/

  /*
      @Usage  : To get calls in queue
      @Param  : uuid of call queue
      */

  // async getCallsInQueue(tenant_uuid) {
  //   try {
  //     let allCallQueues = await this.call_queue.find({ tenant_uuid }).exec();
  //     const queueMap = {};
  //     allCallQueues.forEach((q: any) => {
  //       queueMap[q.uuid] = q.name;   // uuid → human-readable name
  //     });
  //     return new Promise((resolve, reject) => {
  //       // let conn = new esl.Connection(
  //       //   process.env.FS_HOST,
  //       //   process.env.FS_PORT,
  //       //   process.env.FS_PASSWORD,
  //       //   function () {
  //       let conn = this.commonFn.fetchFsConnection();
  //       conn.api(
  //         `callcenter_config queue list members`,
  //         async function (res) {
  //           const data = res.getBody().trim();
  //           console.log("call queue response data", data);

  //           let queues = {};

  //           if (data && data.includes("|")) {
  //             const lines = data.split("\n").filter(line => line.trim() && !line.startsWith("+OK"));
  //             const headers = lines[0].split("|");

  //             // convert table into objects
  //             const rows = lines.slice(1).map(line => {
  //               let values = line.split("|");
  //               let obj = {};
  //               headers.forEach((h, i) => {
  //                 obj[h] = values[i];
  //               });
  //               return obj;
  //             });

  //             rows.forEach(r => {
  //               const queueUuid = r.queue || "";
  //               const queueName = queueMap[queueUuid] || queueUuid; // fallback to uuid if not found

  //               if (!queues[queueName]) {
  //                 queues[queueName] = {
  //                   queue_name: queueName,
  //                   agents: new Set(),
  //                   ready_status: 0,
  //                   waiting_calls: 0,
  //                   active_calls: 0,
  //                   abandoned_calls: 0,
  //                   calls: []
  //                 };
  //               }

  //               // build call object
  //               const callObj = {
  //                 queue_status: r.state || "",
  //                 phone_number: r.cid_number || "",
  //                 did_number: r.cid_num || "",
  //                 wait_time: r.joined_epoch
  //                   ? Math.floor(Date.now() / 1000) - parseInt(r.joined_epoch, 10)
  //                   : "",
  //                 call_type: r.call_type || "inbound",
  //                 serving_agent: r.serving_agent || ""
  //               };

  //               queues[queueName].calls.push(callObj);

  //               // aggregate stats
  //               if (r.serving_agent) queues[queueName].agents.add(r.serving_agent);
  //               if (r.state === "Waiting" || r.state === "Trying") queues[queueName].waiting_calls++;
  //               if (r.state === "Answered") queues[queueName].active_calls++;
  //               if (r.state === "Abandoned") queues[queueName].abandoned_calls++;
  //             });

  //             // convert Set to count
  //             Object.values(queues).forEach((q: any) => {
  //               q.agents = q.agents.size;
  //             });
  //           }

  //           console.log("quuueueueeeee", Object.values(queues))

  //           resolve(Object.values(queues));

  //           conn.disconnect(() => {
  //             console.log("Fs Connection closed");
  //           });
  //         }
  //       );
  //     }
  //     );
  //     // });
  //   } catch (err) {
  //     Logger.debug(err.message, "Unable to make connection with fs using ESL");
  //   }
  // }

  // async getCallsInQueue(tenant_uuid) {
  //   try {
  //     // Step 1: Get only tenant queues from DB
  //     let tenantQueues = await this.call_queue.find({ tenant_uuid }).exec();

  //     if (!tenantQueues.length) return [];

  //     let conn = this.commonFn.fetchFsConnection();

  //     let resultQueues = [];

  //     // Step 2: Loop tenant queues
  //     for (let q of tenantQueues) {

  //       let queueName = `${q.uuid}@default`;  // must match FS queue name

  //       let queueData: any = await new Promise((resolve, reject) => {
  //         conn.api(
  //           `callcenter_config queue list members ${queueName}`,
  //           function (res) {
  //             resolve(res.getBody().trim());
  //           }
  //         );
  //       });

  //       // Step 3: Parse response
  //       let queues: any = {
  //         queue_name: q.name,
  //         agents: new Set(),
  //         waiting_calls: 0,
  //         active_calls: 0,
  //         abandoned_calls: 0,
  //         calls: []
  //       };

  //       if (queueData.includes("|")) {
  //         const lines = queueData
  //           .split("\n")
  //           .filter(line => line.trim() && !line.startsWith("+OK"));

  //         const headers = lines[0].split("|");

  //         const rows = lines.slice(1).map(line => {
  //           let values = line.split("|");
  //           let obj = {};
  //           headers.forEach((h, i) => {
  //             obj[h] = values[i];
  //           });
  //           return obj;
  //         });

  //         rows.forEach(r => {

  //           queues.calls.push({
  //             queue_status: r.state,
  //             phone_number: r.cid_number,
  //             wait_time: r.joined_epoch
  //               ? Math.floor(Date.now() / 1000) - parseInt(r.joined_epoch, 10)
  //               : 0,
  //             serving_agent: r.serving_agent || ""
  //           });

  //           if (r.serving_agent) queues.agents.add(r.serving_agent);

  //           if (r.state === "Waiting" || r.state === "Trying")
  //             queues.waiting_calls++;

  //           if (r.state === "Answered")
  //             queues.active_calls++;

  //           if (r.state === "Abandoned")
  //             queues.abandoned_calls++;
  //         });
  //       }

  //       queues.agents = queues.agents.size;
  //       resultQueues.push(queues);
  //     }

  //     conn.disconnect();

  //     return resultQueues;

  //   } catch (err) {
  //     console.log("Error:", err.message);
  //     return [];
  //   }
  // }

  async getCallsInQueue(tenant_uuid) {
    try {
      let allCallQueues = await this.call_queue.find({ tenant_uuid }).exec();
      const queueMap = {};
      allCallQueues.forEach((q: any) => {
        queueMap[q.uuid] = q.name;   // uuid → human-readable name
      });
      return new Promise((resolve, reject) => {
        const processQueueData = (res: any, conn: any) => {
          const data = res.getBody().trim();
          console.log("call queue response data", data);

          let queues = {};

          if (data?.includes("|")) {
            const lines = data.split("\n").filter(line => line.trim() && !line.startsWith("+OK"));
            const headers = lines[0].split("|");

            // convert table into objects
            const rows = lines.slice(1).map(line => {
              const values = line.split("|");
              const obj = {};
              headers.forEach((h, i) => obj[h] = values[i]);
              return obj;
            });

            rows.forEach(r => {
              const queueUuid = r.queue ? r.queue.split('@')[0] : ""; // Handle case where queue might be uuid@default
              const queueName = queueMap[queueUuid];

              if (queueName) {
                console.log(`Processing row for queue: ${queueName}, state: ${r.state}`);
                console.log(`Matched queue: ${queueName} for UUID: ${queueUuid}`);
                if (!queues[queueName]) {
                  queues[queueName] = {
                    queue_name: queueName,
                    agents: new Set(),
                    ready_status: 0,
                    waiting_calls: 0,
                    active_calls: 0,
                    abandoned_calls: 0,
                    calls: []
                  };
                }

                // build call object
                const callObj = {
                  queue_status: r.state || "",
                  phone_number: r.cid_number || "",
                  did_number: r.cid_num || "",
                  wait_time: r.joined_epoch
                    ? Math.floor(Date.now() / 1000) - parseInt(r.joined_epoch, 10)
                    : "",
                  call_type: r.call_type || "inbound",
                  serving_agent: r.serving_agent || ""
                };

                queues[queueName].calls.push(callObj);

                // aggregate stats
                if (r.serving_agent) queues[queueName].agents.add(r.serving_agent);
                if (r.state === "Waiting" || r.state === "Trying") queues[queueName].waiting_calls++;
                if (r.state === "Answered") queues[queueName].active_calls++;
                if (r.state === "Abandoned") {
                  console.log(`Counted abandoned call for queue: ${queueName}`);
                  queues[queueName].abandoned_calls++;
                }
              } else {
                console.log(`Skipping row for unrecognized/unowned queue UUID: ${queueUuid}`);
              }
            });

            // convert Set to count
            Object.values(queues).forEach((q: any) => {
              q.agents = q.agents.size;
            });
          }

          console.log("quuueueueeeee", Object.values(queues));

          resolve(Object.values(queues));

          conn.disconnect(() => {
            console.log("Fs Connection closed");
          });
        };

        let conn: any;
        if (process.env.ENABLE_FS === 'true') {
          conn = new esl.Connection(
            process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD,
            function () { conn.api(`callcenter_config queue list members`, function (res) { processQueueData(res, conn); }); }
          );
        } else {
          conn = this.commonFn.fetchFsConnection();
          conn.api(`callcenter_config queue list members`, function (res) { processQueueData(res, conn); });
        }
      });
    } catch (err: any) {
      Logger.debug(err.message, "Unable to make connection with fs using ESL");
    }
  }

  /*
  @Usage                : Fetch agent's data with request tenant
  @Param queryParams    : Request params
  @return Object        : Array of an object containing agent live data , agent live list , leads in campaign of tenant
  */

  async getRealtimeReportOfAgents(queryParams: any) {
    // console.log( "queryParams ==> ", queryParams );

    let searchFields = ["agent_name", "campaign_name", "extension_name", "phone_number"];

    //Variable declaration
    let searchParams = [], query: any = {}, checkRole: any = {}, result, totalCount = 0, activeLogin: any = 0, agentWaiting: any = 0, agentBreak: any = 0, agentOnCall: any = 0, finalArray: any = {}, activeCalls: any = 0, obj: any, callAgentWaiting: any = 0, callAgentRinging: any = 0, recentActivityTime: any, loggedInTimeCalculation = [];

    try {
      //Check search parameters
      if (queryParams.search != "" && queryParams.search != undefined) {
        searchFields.map((data) => {
          searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } })
        })
        query = { '$or': searchParams };
      }

      //Check Role type
      let { role, tenant_uuid, parent_uuid } = queryParams;

      if (role == "tenant" || role == "manager") {
        checkRole = {
          tenant_uuid: parent_uuid || tenant_uuid, status: { $ne: "6" }, agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' }
        };
      }

      const loggedInUsers = await this.user.find({ tenant_uuid: parent_uuid || tenant_uuid, is_logged_in: "0" }).exec();
      const userMap = new Map();  // Create a Map for quick lookup of user details using agent UUID as the key
      loggedInUsers.forEach(u => { userMap.set(u.uuid, u); });  // Store each user object in the map
      result = await this.agent_live_report.aggregate([
        {
          $match: {
            $or: [
              {
                $and: [
                  { tenant_uuid: parent_uuid || tenant_uuid },
                  // { status: { $ne: "6" } },
                  { agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }
                ]
              },
              {
                $and: [query, checkRole]
              }
            ]
          }
        },
        {
          $lookup: {
            from: "breakcode", // name of the breakcode collection
            localField: "tenant_uuid",
            foreignField: "tenant_uuid",
            as: "breakcode_data"
          }
        }
        /*$or: [
          {
           $and : [
             {tenant_uuid:  parent_uuid},
                       {status :{ $ne: "6" }},
             {agent_logged_in_time: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' }}
           ]
          }
                ]*/
      ]);

      const finalRes: any = []
      loggedInUsers.map((user) => {
        result.map((val) => {
          if (user?.uuid === val?.agent_uuid && user?.is_logged_in === "0") {
            finalRes.push(val);
          }
        })
      });

      //result = await this.agent_live_report.find({ $and: [ {},{} ] }).sort({ _id: 1 }).exec();
      //result = await this.agent_live_report.find({ $and: [query, checkRole] }).sort({ _id: 1 }).exec();
      //result = await this.agent_live_report.find({ $and: [{ $or:[query, checkRole] }, { $or: [{tenant_uuid : queryParams.parent_uuid}] }] }).sort({ _id: 1 }).exec();
      //result = await this.agent_live_report.find({ $and: [{ $or:[query, checkRole] }, { $and: [{status: { $ne: "6" }}, { $or : [{ tenant_uuid : queryParams.parent_uuid }] } ] }] }).sort({ _id: 1 }).exec();
      //Do query for count only when pagination set to true
      /*if (result.length > 0) {
        totalCount = await this.agent_live_report.find({ $and: [query, checkRole] }).count().exec();
      }*/


      finalRes?.map((data) => {
        const user = userMap.get(data.agent_uuid);  // Get matching user details using agent_uuid from the map
        data["fullname"] = user ? `${user.fullname || ""}`.trim() : ""; // Add fullname field to agent live data

        //Active Login
        activeLogin = (data?.status == "0" || data?.status == "1" || data?.status == "2" || data?.status == "4" || data?.status == "5") ? activeLogin + 1 : activeLogin;

        //Agent Waiting
        agentWaiting = (data?.status == "0") ? agentWaiting + 1 : agentWaiting;
        //agentWaiting = ( ( data?.campaign_type == "1" || data?.campaign_type == "2" ) && data?.status != "4" ) ? agentWaiting + 1 : agentWaiting;

        //Agent Break
        agentBreak = (data?.status == "3") ? agentBreak + 1 : agentBreak;

        //Agent On Call
        agentOnCall = (data?.status == "1" || data?.status == "2") ? agentOnCall + 1 : agentOnCall;

        //Get time difference
        recentActivityTime = data?.updatedAt;
        let diff = this.convertDuration(recentActivityTime);
        data["from_last_logged_in"] = diff;
        console.log("asfbasdas agent list logss", data)
        if (data.status != "3") {
          data["break_name"] = ""
          data["break_duration"] = ""
        } else {
          data["break_name"] = data["break_name"] || ""
          data["break_duration"] = data["break_duration"] || ""
        }
        loggedInTimeCalculation.push(data);

      });

      //Get agent waiting calls
      //let allQueues = await this.commonFn.fetchAllQueues();
      //callAgentWaiting = await this.fetchExistQueuesOfTenant(allQueues, tenant_uuid);
      //Get agent ringing calls
      //callAgentRinging = await this.getCallRingingAgent(tenant_uuid);

      //Get outbound count of waiting and ringing
      let outboundCountsNew: any = await this.getOutboundCount(tenant_uuid, queryParams);

      //Get inbound count of waiting and ringing
      let inboundCountsNew: any = await this.getInboundCount(tenant_uuid, queryParams);

      obj = { activeLogin, agentWaiting, agentBreak, agentOnCall: (outboundCountsNew.agentOnCall + inboundCountsNew.agentOnCall), callAgentWaiting: { inboundCount: inboundCountsNew?.waitingInbound, outboundCount: outboundCountsNew.waitingOutbound }, callAgentRinging: { inboundCount: inboundCountsNew?.ringingInbound, outboundCount: outboundCountsNew.ringingOutbound } };
      // obj.activeCalls = inboundCountsNew?.waitingInbound + outboundCountsNew?.waitingOutbound + ( outboundCountsNew.agentOnCall + inboundCountsNew.agentOnCall ) + inboundCountsNew?.ringingInbound + outboundCountsNew?.ringingOutbound;
      //obj = { activeLogin, agentWaiting, agentBreak, agentOnCall, callAgentWaiting, callAgentRinging };
      obj.activeCalls = outboundCountsNew.active_call_count + inboundCountsNew.active_call_count;

      //obj.activeCalls = callAgentWaiting?.inboundCount + callAgentWaiting?.outboundCount + agentOnCall + callAgentRinging?.inboundCount + callAgentRinging?.outboundCount;

      finalArray["agent_live_data"] = obj;

      const queue_details = await this.getCallsInQueue(tenant_uuid);

      //objects for both live Agents and totalLiveCallsCount
      const liveCallsCount = {
        activeCalls: obj.activeCalls,
        waitingCalls: (inboundCountsNew.waitingInbound) + (outboundCountsNew.waitingOutbound),
        ringingCalls: (inboundCountsNew.ringingInbound) + (outboundCountsNew.ringingOutbound),
        ivrCalls: 0,

      }

      const pausedCount = await this.agent_live_report.countDocuments({ tenant_uuid: tenant_uuid, status: '4' });
      const inCallsCount = await this.agent_live_report.countDocuments({ tenant_uuid: tenant_uuid, status: { $in: ['1', '2'] } });

      const liveAgentsOnCalls = {
        pausedCount: pausedCount,
        inCallsCount: inCallsCount
      }

      finalArray.liveCallsCount = liveCallsCount;
      finalArray.liveAgentsOnCalls = liveAgentsOnCalls;

      return {
        statusCode: HttpStatus.OK,
        agents_live_data: finalArray.agent_live_data,
        agents_list: loggedInTimeCalculation,
        queue_details: queue_details,
        // calls_in_queue: queue_details?.calls_in_queue,
        // queue_wise_agent: queue_details?.queue_wise_agent,
        //campaign_details: await this.getLeadsPerCampaign(queryParams)
        campaign_details: await this.getCampaignWiseData(queryParams),
        liveAgentsOnCalls: liveAgentsOnCalls,
        liveCallsCount: liveCallsCount
      }

    } catch (error: any) {
      Logger.error(`Error in realtime report`, error.message);
      return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, [], totalCount);
    }
  }

  /*
  @Usage                : Fetch campaign from requested tenant
  @Param queryParams    : Request params
  @return Object        : Array of an object containing leads in campaign of tenant
  */

  async getLeadsPerCampaign(queryParams) {
    const { tenant_uuid } = queryParams;

    //Get all active lead group of logged in tenant
    let allLeadGroups = await this.lead_group.find({ tenant_uuid, status: "0" }).exec();
    let allLeadGroupArray = [];
    if (allLeadGroups.length > 0) {
      allLeadGroups.map((data) => {
        allLeadGroupArray.push(data.uuid);
      });
    } else {
      Logger.warn(`No lead group found on tenant ==> ${tenant_uuid}`);
    }

    let match = {}, groupByDetails, result, lookupDetails, obj = {}, campaignsArray = [], leadGroupStatus, allData;
    lookupDetails = { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" };
    match = { tenant_uuid, lead_group_uuid: { $in: allLeadGroupArray } };
    groupByDetails = {
      _id: {
        tenant_uuid: "$tenant_uuid",
        campaign_uuid: "$campaign_uuid",
      },
      lead_group_uuid: { $first: "$lead_group_uuid" },
      "campaign": {
        "$first": "$outbound_campaign.name"
      },
      "dialLevel": { "$first": "$outbound_campaign.concurrent_call" },
      count: { $sum: 1 }
    }

    try {
      result = await this.commonDbFn.fetchDataByGroup(this.leads_in_queue, match, lookupDetails, groupByDetails, { "count": 1 }, "", { campaign: 1, dialLevel: 1, count: 1 });
      result?.map(async (data) => {
        obj = {
          campaign_name: data?.campaign,
          lead_count: data?.count,
          campaign_uuid: data?._id.campaign_uuid,
          dial_level: data?.dialLevel[0] == "" ? 0 : data?.dialLevel[0]
        }
        campaignsArray.push(obj);
      });
      let data = await this.getFailAndSuccessCountOfCampaign(campaignsArray, tenant_uuid);
      let dataWithTotalLeads = await this.getTotalLeads(tenant_uuid, data);
      let getInboundBlendedCount = await this.getInboundBlendedCount(tenant_uuid);
      getInboundBlendedCount = getInboundBlendedCount?.length > 0 ? getInboundBlendedCount : [];
      let finalData = [...dataWithTotalLeads, ...getInboundBlendedCount];
      return finalData;
    } catch (error: any) {
      Logger.error(`Error in getting leads per campaign`, error.message);
    }
  }

  /*
  @Usage              : To search data in agent live report using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of agents with data
  */

  async realtimeReportAdvancedSearch(searchParams) {
    const { campaign_uuid, tenant_uuid, role, parent_uuid } = searchParams;
    const splitCampaigns = campaign_uuid;
    // const splitCampaigns = campaign_uuid.split( "," );
    let match: any = { campaign_uuid: { $in: splitCampaigns } };
    if (role == "tenant" || role == "manager") {
      match.tenant_uuid = parent_uuid || tenant_uuid;
    } else {
      match.tenant_uuid = tenant_uuid;
    }

    let response = await this.agent_live_report.find(match).exec();
    let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return this.commonDbFn.sendResponseWithMessage(statusCode, response);
  }

  /*
  @Usage                  : To get time difference from last which time user is logged in
  @Param lastLoggedInTime : From last which time user is logged in
  @return string          : H:m:s [Ex : 2:05:05]
  */

  convertDuration(lastLoggedInTime) {
    let currentISODateTime: any = new Date().toISOString();
    const date1: any = new Date(lastLoggedInTime);
    const date2: any = new Date(currentISODateTime);
    var milliseconds = date2 - date1;

    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / 1000 / 60) % 60);
    const hours = Math.floor((milliseconds / 1000 / 60 / 60));

    let formattedTime;

    if (milliseconds < 60000) {
      formattedTime = [minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":");
    } else {
      if (hours === 0) {
        formattedTime = [minutes.toString(), seconds.toString().padStart(2, "0")].join(":");
      } else {
        formattedTime = [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":");
      }
    }

    return formattedTime;
  }

  /*
  @Usage                  : To fetch success & fail count based on campaign
  @Param campaignList     : Campaigns array
  @return array           : Contains campaign details with call count
  */

  async getFailAndSuccessCountOfCampaign(campaignList, tenant_uuid) {
    try {
      let groupByDetails, result, obj = {}, match;
      match = { tenant_uuid, campaign_date: this.commonFn.getTodayDate() };
      groupByDetails = {
        _id: "$campaign_uuid",
        success: { $sum: "$success" },
        fail: { $sum: "$fail" },
        drop: { $sum: "$drop" },
        short_call: { $sum: "$short_call" },
        total: { $sum: { $add: ["$success", "$fail"] } },
        amd: { $sum: "$amd" },
        acd: { $sum: "$billsecond" }
      }
      result = await this.commonDbFn.fetchDataByGroup(this.campaign_statistics, match, "", groupByDetails, "", "");

      let results, finalArray = [];
      campaignList.map((data) => {

        results = result.filter((obj) => {
          return Object.keys(obj).reduce((acc, curr) => {
            return acc || obj[curr].toString().toLowerCase().includes(data.campaign_uuid);
          }, false);
        });
        if (results.length != 0) {
          obj = {
            campaign_name: data.campaign_name[0],
            lead_count: data.lead_count,
            success: results[0]?.success != undefined ? ((results[0].success / results[0].total) * 100) : 0,
            fail: results[0]?.fail != undefined ? ((results[0].fail / results[0].total) * 100) : 0,
            drop: results[0]?.drop != undefined ? ((results[0].drop / (results[0]?.success - results[0]?.amd)) * 100) : 0,
            campaign_uuid: data.campaign_uuid,
            dial_level: data.dial_level,
            shortCalls: results[0]?.short_call != undefined ? ((results[0].short_call / results[0].success) * 100) : 0,
            totalCalls: results[0]?.total,
            failed_calls: (results[0]?.total - results[0]?.success),
            success_calls: results[0]?.success,
            drop_calls: results[0]?.drop,
            acd: results[0]?.acd,
            short_calls: results[0]?.short_call
          }
          finalArray.push(obj);
        }
      });
      return finalArray;


    } catch (error: any) {
      Logger.error(`Error in fetching success & fail count of campaign`, error.message);
    }
  }

  /*
  @Usage               : To fetch total queue of logged in tenant
  @Param allQueues     : List of queues exist in freeswitch
  @Param tenant_uuid   : uuid of tenant
  */

  async fetchExistQueuesOfTenant(allQueues, tenant_uuid) {
    try {
      let matched, count = 0;
      let queues = await this.call_queue.find({ tenant_uuid }, { uuid: 1, _id: 0 }).exec();
      if (queues.length > 0) {
        queues.map((data) => {
          if (allQueues.length > 0) {
            matched = allQueues?.filter(function (el) {
              return el.name == `${data.uuid}@default`;
            });
            if (matched.length > 0) { count++; }
          }
        });
        let outboundCustomerWaiting = await this.outbound_customer_waiting_count.find({ tenant_uuid }, { count: 1 });
        return {
          inboundCount: count,
          outboundCount: Number(outboundCustomerWaiting[0]?.count) > 0 ? Number(outboundCustomerWaiting[0]?.count) : 0
        }
      } else {
        Logger.warn(`No call queue exist with tenant_uuid : ${tenant_uuid}`);
      }
    } catch (error: any) {
      Logger.error(`Error in catch block === fetchExistQueuesOfTenant()`, error.message);
    }
  }

  /*
  @Usage               : To fetch uuid of call
  @Param requestDto    : Contains destination,caller_id_number
  @return Object       : Success / Error
  */

  async getCallUUIDFromFS(requestDto) {
    let matched;
    const { destination, caller_id_number, direction } = requestDto;
    try {
      let runningCalls: any = await this.commonFn.getRunningCalls();
      let data = runningCalls?.body ? JSON.parse(runningCalls?.body) : runningCalls?.body;
      matched = data?.rows.filter(function (el) {
        if (direction == "inbound" || direction == "blended") {
          return el.b_sent_callee_num == destination;
        } else {
          return el.dest == destination;
        }
      });
      if (matched.length > 0) {
        Logger.warn(`Fetched call uuid based on caller_id_number : ${caller_id_number} & destination : ${destination}  ==> call uuid = ${matched[0].uuid}`)
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, matched[0].uuid);
      } else {
        Logger.error(`Unable to find call uuid based on caller_id_number : ${caller_id_number} & destination : ${destination}`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, []);
      }
    } catch (error: any) {
      Logger.error(`Error in catch block ===> getCallUUIDFromFS()`, error.message);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, []);
    }
  }

  /*
  @Usage               : To get inbound & outbound customer ringing
  @Param tenant_uuid   : uuid of tenant
  @return Object       : Success / Error
  */

  async getCallRingingAgent(tenant_uuid) {
    let inboundCounts: any = 0, outboundCounts: any = 0;
    try {
      let inboundCount = await this.inbound_customer_ringing.findOne({ tenant_uuid }, { count: 1 }).exec();
      let outboundCount = await this.outbound_customer_ringing.findOne({ tenant_uuid }, { count: 1 }).exec();
      inboundCounts = inboundCount != null ? inboundCount?.count : inboundCounts;
      outboundCounts = outboundCount != null ? outboundCount?.count : outboundCounts;
      return {
        inboundCount: inboundCounts,
        outboundCount: outboundCounts
      }
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getCallRingingAgent()`, error.message);
      return {
        inboundCount: inboundCounts,
        outboundCount: outboundCounts
      }

    }
  }

  /*
  @Usage               : To get call counts
  @Param campaignList  : list of campaings
  @Param result        : list of campaings by filter
  @return Object       : Success / Error
  */

  /*async getCallCounts(campaignList, result) {
    let self = this,allData;
    return new Promise((resolve, reject) => {
      let results, finalArray = [], obj;
      allData = campaignList.map(async (data) => {

        results = await result.filter((obj) => {
          return Object.keys(obj).reduce((acc, curr) => {
            return acc || obj[curr].toString().toLowerCase().includes(data.campaign_uuid);
          }, false);
        });
        return {
          campaign_name: data.campaign_name[0],
          lead_count: data.lead_count,
          success: results[0]?.success,
          fail: results[0]?.fail,
          drop: results[0]?.drop,
          campaign_uuid: data.campaign_uuid,
          totalLeads: await self.lead_management.find({ campaign_uuid: data.campaign_uuid }).count()
        }
        //finalArray.push(obj);
      });
      let result = Promise.all(allData);
      resolve(result);
    })
  }*/

  async getTotalLeads(tenant_uuid, filterData) {
    let match = {}, groupByDetails, result, obj = {}, campaignsArray = [];
    match = { tenant_uuid };
    groupByDetails = {
      _id: {
        campaign_uuid: "$campaign_uuid",
      },
      count: { $sum: 1 }
    }

    try {
      let matched;
      result = await this.commonDbFn.fetchDataByGroup(this.lead_management, match, "", groupByDetails, { "count": 1 });

      result.map((data) => {
        matched = filterData.filter(function (el) {
          return el.campaign_uuid == data._id.campaign_uuid;
        });
        if (matched.length > 0) {
          obj = {
            campaign_name: matched[0].campaign_name,
            lead_count: matched[0].lead_count,
            success: Math.round(matched[0].success),
            fail: Math.round(matched[0].fail),
            drop: Math.round(matched[0].drop),
            campaign_uuid: matched[0].campaign_uuid,
            totalLeads: data.count,
            dial_level: matched[0].dial_level,
            campaign_type: "0",
            leadUsed: parseInt(data.count) - parseInt(matched[0].lead_count),
            shortCalls: Math.round(matched[0].shortCalls),
            totalCalls: matched[0].totalCalls,
            failed_calls: matched[0].failed_calls,
            success_calls: matched[0].success_calls,
            drop_calls: matched[0].drop_calls,
            short_calls: matched[0]?.short_calls
          }
          let acd = matched[0]?.acd / matched[0].success_calls;
          const duration = moment.duration(acd, 'seconds');
          obj["acd"] = `${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
          campaignsArray.push(obj);
        }
      });

      return campaignsArray;
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getTotalLeads()`, error.message);
    }
  }

  /*
  @Usage               : To get inbound & blended campaigns
  @Param tenant_uuid   : list of campaings
  @return Object       : Success / Error
  */

  async getInboundBlendedCount(tenant_uuid) {
    try {
      let match = { tenant_uuid, campaign_date: this.commonFn.getTodayDate() };
      let response = await this.campaign_statistics.aggregate([
        { $match: match },
        {
          $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" }
        },
        {
          $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" }
        },
        { $sort: { _id: -1 } },
        {
          $group: {
            _id: "$campaign_uuid",
            "inbound_campaign_details": { "$first": "$inbound_campaign.name" },
            "inbound_campaign_type": { "$first": "$inbound_campaign.campaign_type" },
            "blended_campaign_details": { "$first": "$blended_campaign.name" },
            "blended_campaign_type": { "$first": "$blended_campaign.campaign_type" },
            success: { $sum: "$success" },
            fail: { $sum: "$fail" },
            drop: { $sum: "$drop" },
            short_call: { $sum: "$short_call" },
            total: { $sum: { $add: ["$success", "$fail", "$drop"] } }
          }
        },
        {
          $project: { inbound_campaign_details: 1, inbound_campaign_type: 1, blended_campaign_details: 1, blended_campaign_type: 1 }
        }
      ]);
      let obj = {}, finalArr = [], campaign_name, campaign_type;
      if (response.length > 0) {
        response?.map((data) => {
          if (data.inbound_campaign_details.length > 0 || data.blended_campaign_details.length > 0) {
            campaign_name = data.inbound_campaign_details.length == 0 ? data.blended_campaign_details[0] : data.inbound_campaign_details[0];
            campaign_type = data.inbound_campaign_type.length == 0 ? data.blended_campaign_type[0] : data.inbound_campaign_type[0];

            obj = {
              campaign_name,
              lead_count: "-",
              success: data?.success != undefined ? data.success : 0,
              fail: data?.fail != undefined ? data.fail : 0,
              drop: data?.drop != undefined ? data.drop : 0,
              campaign_uuid: data._id.campaign_uuid,
              totalLeads: 0,
              dial_level: 0,
              campaign_type,
              shortCalls: data.short_call,
              totalCalls: data.total
            }
            finalArr.push(obj);
          }
        });
        return finalArr;
      } else {
        Logger.debug(`No data found ===> getInboundBlendedCount()`);
      }
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getInboundBlendedCount()`, error.message);
    }
  }

  /*
  @Usage               : To get lead group status active or not
  @Param leadGroupUUID : uuid of lead group
  @return String
  */

  async getLeadGroupStatus(leadGroupUUID) {
    try {
      let result = await this.lead_group.findOne({ uuid: leadGroupUUID }, { status: 1, _id: 0 }).exec();
      return result != null ? result.status : "1";
    } catch (error: any) {
      Logger.error(`Error in fetching lead group status`, error.message);
    }
  }

  /*
  @Usage               : To get outbound count for waiting and ringing calls
  @Param tenant_uuid   : uuid of tenant
  @return String
  */

  async getOutboundCount(tenant_uuid, queryParams) {
    const { parent_uuid, role } = queryParams;
    let match = {}, groupByDetails, result, lookupDetails, agentOnCall = 0, ringingOutbound = 0, waitingOutbound = 0, active_call_count = 0, count = 0, finalArray = [];
    //match = { tenant_uuid };
    //match = role == "tenant" ? { tenant_uuid } : { $or:[{tenant_uuid:parent_uuid},{tenant_uuid}] };
    match = role == "tenant" ? { tenant_uuid } : { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
    groupByDetails = {
      _id: {
        tenant_uuid: "$tenant_uuid",
        type: "$type",
      },
      count: { $sum: 1 }
    }

    try {
      /* if(role == "tenant"){
         result = await this.commonDbFn.fetchDataByGroup(this.realtime_report_count_management, match, "", groupByDetails, "", "", "");
       }else{
         result = await this.commonDbFn.fetchDataByGroup(this.manager_outbound_report, match, "", groupByDetails, "", "", "");
       }*/
      result = await this.commonDbFn.fetchDataByGroup(this.realtime_report_count_management, match, "", groupByDetails, "", "", "");
      if (result.length > 0) {
        // active_call_count = result.length;
        let query;
        if (role == "tenant") {
          query = { tenant_uuid };
        } else {
          query = { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
        }
        count = await this.realtime_report_count_management.find(query).count().exec();
        result.map((data) => {
          finalArray = [];
          ringingOutbound = data._id.type == 0 ? (ringingOutbound + data.count) : ringingOutbound;
          waitingOutbound = data._id.type == 1 ? (waitingOutbound + data.count) : waitingOutbound;
          agentOnCall = data._id.type == 2 ? (agentOnCall + data.count) : agentOnCall;
          active_call_count = count;
        });
        finalArray.push({ ringingOutbound, waitingOutbound, agentOnCall, active_call_count });
      } else {
        finalArray.push({ ringingOutbound, waitingOutbound, agentOnCall, active_call_count });
      }
      return finalArray[0];
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getOutboundCount()`, error.message);
    }
  }

  async getInboundCount(tenant_uuid, queryParams) {
    let match = {}, groupByDetails, result, agentOnCall = 0, ringingInbound = 0, waitingInbound = 0, active_call_count = 0, count = 0, finalArray = [];
    //match = { tenant_uuid };
    const { parent_uuid, role } = queryParams;
    match = role == "tenant" ? { tenant_uuid } : { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
    groupByDetails = {
      _id: {
        tenant_uuid: "$tenant_uuid",
        type: "$type",
      },
      count: { $sum: 1 }
    }

    try {
      result = await this.commonDbFn.fetchDataByGroup(this.realtime_report_inbound_count_management, match, "", groupByDetails, "", "", { count: 1 });
      if (result.length > 0) {
        // active_call_count = result.length;
        let query;
        if (role == "tenant") {
          query = { tenant_uuid };
        } else {
          query = { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
        }
        count = await this.realtime_report_inbound_count_management.find(query).count().exec();
        result.map((data) => {
          ringingInbound = data._id.type == 0 ? (ringingInbound + data.count) : ringingInbound;
          waitingInbound = data._id.type == 1 ? (waitingInbound + data.count) : waitingInbound;
          agentOnCall = data._id.type == 2 ? (agentOnCall + data.count) : agentOnCall;
          active_call_count = count;
        });
        finalArray.push({ ringingInbound, waitingInbound, agentOnCall, active_call_count });
      } else {
        finalArray.push({ ringingInbound, waitingInbound, agentOnCall, active_call_count });
      }
      return finalArray[0];
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getInboundCount()`, error.message);
    }
  }


  /*
  @Usage        : To get data campaign wise
  @Param params : uuid of tenant
  @return       : Array of an object
  */

  async getCampaignWiseData(params) {
    const { tenant_uuid, role, parent_uuid, assigned_manager_role } = params;
    try {
      let getAllowedCampaigns = await this.commonDbFn.getManagerRoleInfo(assigned_manager_role, 'outbound-campaign');
      let getAllowedBlendedCampaigns = await this.commonDbFn.getManagerRoleInfo(assigned_manager_role, 'blended-campaign');
      let match = {};
      // let outboundCampaigns = await this.outbound_campaign.find( { $and: [ { $or: [ { uuid: { $in: getAllowedCampaigns } }, { tenant_uuid } ] }, { $or: [ { status: "0" } ] } ] }, { uuid: 1, name: 1, campaign_type: 1, concurrent_call: 1, _id: 0 } ).exec();
      let outboundCampaigns = await this.outbound_campaign.find({ $and: [{ $or: [{ uuid: { $in: getAllowedCampaigns } }, { tenant_uuid }] }, { $or: [{ status: "0" }] }] }, { uuid: 1, name: 1, campaign_type: 1, concurrent_call: 1, total_leads_count: 1, leads_in_queue_count: 1, _id: 0 }).exec();
      let blendedCampaigns = await this.blended_campaign.find({ $and: [{ $or: [{ uuid: { $in: getAllowedBlendedCampaigns } }, { tenant_uuid }] }, { $or: [{ status: "0" }] }] }, { uuid: 1, name: 1, campaign_type: 1, concurrent_call: 1, total_leads_count: 1, leads_in_queue_count: 1, _id: 0 }).exec();

      let allCampaigns = [...outboundCampaigns, ...blendedCampaigns];
      match = role == "tenant" ? { tenant_uuid } : { $or: [{ tenant_uuid: parent_uuid }, { manager_uuid: tenant_uuid }] };
      //match["campaign_date"] = this.commonFn.getTodayDate();
      match = { ...match, campaign_date: this.commonFn.getTodayDate() };
      let campaignCallsStatistics = await this.campaign_statistics.aggregate([
        /* {
           $match: { tenant_uuid, campaign_date: this.commonFn.getTodayDate() }
         },*/
        {
          $match: match
        },
        {
          $lookup: { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" }
        },
        {
          $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" }
        },
        {
          $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" }
        },
        {
          $group: {
            _id: "$campaign_uuid",
            success: { $sum: "$success" },
            fail: { $sum: "$fail" },
            drop: { $sum: "$drop" },
            short_call: { $sum: "$short_call" },
            total: { $sum: { $add: ["$success", "$fail"] } },
            amd: { $sum: "$amd" },
            acd: { $sum: "$billsecond" }
          },
        }
      ]).exec();

      return this.addCampaignStatisticsDataToAllCampaign(allCampaigns, campaignCallsStatistics, tenant_uuid);
    } catch (error: any) {
      Logger.error(`Error in catch block ==>`, error.message);
    }
  }

  /*
  @Usage                         : Calculate calls data based on campaign
  @Param allCampaigns            : Contains all campaign's of tenant
  @Param campaignCallsStatistics : Contains call data of campaign's
  @Param tenant_uuid             : uuid of tenant
  @return                        : Array of an object
  */

  async addCampaignStatisticsDataToAllCampaign(allCampaigns, campaignCallsStatistics, tenant_uuid) {
    let finalArray = [], filterData;
    allCampaigns?.map((data) => {

      filterData = campaignCallsStatistics.filter(item => item._id == data.uuid); //Compare campaign uuid
      finalArray.push({
        campaign_name: data.name,
        uuid: data.uuid,
        dial_level: data.concurrent_call == undefined ? '0' : data.concurrent_call,
        campaign_type: data.campaign_type,

        //Calculating data in (%)
        success: (filterData[0]?.success && filterData[0]?.total) ? Math.round(((filterData[0].success / filterData[0].total) * 100)) : 0,
        fail: (filterData[0]?.fail && filterData[0]?.total) ? Math.round(((filterData[0].fail / filterData[0].total) * 100)) : 0,
        // drop: ( filterData[ 0 ]?.drop && filterData[ 0 ]?.success && filterData[ 0 ]?.amd ) ? Math.round( ( ( filterData[ 0 ].drop / ( filterData[ 0 ]?.success - filterData[ 0 ]?.amd ) ) * 100 ) ) : 0,
        drop: (filterData[0]?.drop != null && filterData[0]?.success != null && filterData[0]?.amd != null) ?
          Math.round((filterData[0].drop / (filterData[0].success - filterData[0].amd)) * 100) : 0,
        shortCalls: (filterData[0]?.short_call && filterData[0]?.success) ? Math.round(((filterData[0].short_call / filterData[0].success) * 100)) : 0,
        //acd: filterData[0]?.acd ? filterData[0]?.acd : 0,
        acd: (filterData[0]?.acd) ? this.calculateAcd(filterData[0]?.acd, filterData[0]?.success) : 0,
        totalCalls: filterData[0]?.total ? filterData[0]?.total : 0,
        failed_calls: filterData[0]?.fail ? filterData[0]?.fail : 0,
        success_calls: filterData[0]?.success ? filterData[0]?.success : 0,
        drop_calls: filterData[0]?.drop ? filterData[0]?.drop : 0,
        short_calls: filterData[0]?.short_call ? filterData[0]?.short_call : 0,
        totalLeads: data.total_leads_count == undefined ? '0' : data.total_leads_count,
        lead_count: data.leads_in_queue_count == undefined ? '0' : data.leads_in_queue_count,
        leadUsed: (data.total_leads_count - data.leads_in_queue_count)
      });
    });

    //Get lead information
    // const campaignsWithLeadInformation = await this.getLeadInformation( tenant_uuid, finalArray );
    // const realtimeReportFinalData = await this.getLeadsInQueue( campaignsWithLeadInformation, tenant_uuid );
    return finalArray;
  }

  /*
  @Usage              : To get total leads campaign wise
  @Param mainArray    : Contains all campaign's of tenant with call data
  @Param tenant_uuid  : uuid of tenant
  @return             : Array of an object
  */

  async getLeadInformation(tenant_uuid, mainArray) {
    try {
      let result = await this.lead_management.aggregate([
        {
          $match: { tenant_uuid }
        },
        {
          $group: {
            _id: {
              campaign_uuid: "$campaign_uuid",
              tenant_uuid: "$tenant_uuid"
            },
            totalLeads: { $sum: 1 }
          },
        }
      ]).exec();

      let filterData, finalData = [];
      mainArray.map((data, i) => {
        filterData = result.filter(item => item._id.campaign_uuid == data.uuid); //Compare campaign uuid
        if (filterData.length) {
          finalData.push({ ...data, totalLeads: filterData[0].totalLeads });
        } else {
          finalData.push({ ...data, totalLeads: 0 });
        }
      });
      return finalData;

    } catch (error: any) {
      Logger.error(`Error in catch block ==> getLeadInformation()`, error.message);
    }
  }

  /*
  @Usage                              : To get leads which are in queue campaign wise
  @Param campaignsWithLeadInformation : Contains all campaign's of tenant with call & lead data
  @Param tenant_uuid                  : uuid of tenant
  @return                             : Array of an object
  */

  async getLeadsInQueue(campaignsWithLeadInformation, tenant_uuid) {
    try {
      //Get all active lead group
      /*let allLeadGroups = await this.lead_group.find({ tenant_uuid, status: "0" }).exec();
      let allLeadGroupArray = [];
      if (allLeadGroups.length > 0) {
        allLeadGroups.map((data) => {
          allLeadGroupArray.push(data.uuid);
        });
      } else {
        Logger.warn(`No lead group found on tenant ==> ${tenant_uuid}`);
      }*/
      //lead_group_uuid: { $in: allLeadGroupArray }
      let result = await this.leads_in_queue.aggregate([
        {
          $match: { tenant_uuid }
        },
        {
          $group: {
            _id: "$campaign_uuid",
            leadsInQueue: { $sum: 1 }
          }
        }
      ]).exec();

      let filterData, finalData = [];
      campaignsWithLeadInformation.map((data, i) => {
        filterData = result.filter(item => item._id == data.uuid); //Compare campaign uuid
        if (filterData.length) {
          finalData.push({ ...data, lead_count: filterData[0].leadsInQueue, leadUsed: (data.totalLeads - filterData[0].leadsInQueue) });
        } else {
          finalData.push({ ...data, lead_count: 0, leadUsed: 0 });
        }
      });
      return finalData;
    } catch (error: any) {
      Logger.error(`Error in catch block ==> getLeadsInQueue()`, error.message);
    }
  }

  /*
  @Usage         : To get calculated ACD
  @Param acd     : Count of acd
  @Param success : Count of success
  @return        : acd value in format [minutes:seconds]
  */

  calculateAcd(acd, success) {
    let acdVal = acd / success;
    const duration = moment.duration(acdVal, 'seconds');
    return `${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  }

  private async checkWhatsappPermission(role_uuid: any): Promise<boolean> {
    try {
      if (!role_uuid) return false;
      const role: any = await this.roles.findOne({ uuid: role_uuid.toString() }).exec();
      if (!role) return false;

      const whatsappPermission = role.module_permission?.messaging?.whatsapp;
      return Number(whatsappPermission) > 0;
    } catch (error) {
      Logger.error(`Error checking WhatsApp permission for role ${role_uuid}: ${error.message}`);
      return false;
    }
  }

  /************************************* CRON JOB *******************************************/

  /*
  @Usage               : Remove agents data from agent live report collection
  @Param  execute time : Every midnight at (00:00)
  */

  /*@Cron("'0 0 * * *'", { name: "Remove data from agent live report every night(00:00) hour" })
  async removeAgentsData() {
    try {
      let response = await this.agent_live_report.deleteMany({});
      if (response.deletedCount > 0) {
        Logger.debug(`Deleted agents from live report`);
      } else {
        Logger.debug(`Logger block ==== Unable to agents from live report`);
      }
    } catch (error) {
      Logger.error(`Catch block CRON ====> removeAgentsData()`, error.message);
    }
  }*/


  async createtenantpersonalization(tenantpersonalizationDto: TenantPersonalizationDto) {
    const { tenant_uuid, uuid } = tenantpersonalizationDto;
    let where = { tenant_uuid };
    let logMessages = {
      logErrorMsg: "Tenant Personalization already exist \n",
      logSuccessMsg: "Tenant Personalization uploaded successfully \n"
    }
    console.log(tenantpersonalizationDto);
    // let response = await this.commonDbFn.findAndInsert( this.tenantpersonalization, where, tenantpersonalizationDto, JSON.stringify( logMessages ), "and" );
    let tenant_personalization_data = await this.tenant_personalization.findOne(where);
    console.log(tenant_personalization_data);
    if (tenant_personalization_data != null) {
      if (tenant_personalization_data.expandedfile && tenant_personalization_data.expandedfile != '' && tenantpersonalizationDto.expandedfile) {
        console.log('expand');
        const expand_part = tenant_personalization_data.expandedfile.split('_');
        let expand_remove_file = expand_part[0] + "/" + expand_part[1];
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${expand_remove_file}`, (result) => { });
      }
      if (tenant_personalization_data.collapsedfile && tenant_personalization_data.collapsedfile != '' && tenantpersonalizationDto.collapsedfile) {
        console.log('collapsed')
        const collapsed_part = tenant_personalization_data.collapsedfile.split('_');
        let collapsed_remove_file = collapsed_part[0] + "/" + collapsed_part[1];
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${collapsed_remove_file}`, (result) => { });
      }
      if (tenant_personalization_data.faviconfile && tenant_personalization_data.faviconfile != '' && tenantpersonalizationDto.faviconfile) {
        console.log('favicon')
        const favicon_part = tenant_personalization_data.faviconfile.split('_');
        let favicon_remove_file = favicon_part[0] + "/" + favicon_part[1];
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${favicon_remove_file}`, (result) => { });
      }
    }
    let response = await this.commonDbFn.findoneandupdate(this.tenant_personalization, where, tenantpersonalizationDto, JSON.stringify(logMessages), { upsert: true })
    // let response = await this.tenant_personalization.findOneAndUpdate( where, tenantpersonalizationDto, { upsert: true } );
    console.log(response);
    return response;
  }

  /*
  @Usage          : To get single tenant personalization record based on uuid
  @Param uuid     : Search tenant by uuid
  @return Object  : Result of tenant
  */

  async tenantpersonalizationfindone(domain) {
    console.log(domain);
    const user = await this.tenant_personalization.findOne({ tenant_domain: domain.domain }).exec();
    if (user == null) {
      Logger.error(`Tenant Personalization not found by uuid : ${domain} \n`, getMethod);
      // throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Tenant Personalization not found" } )
    }
    Logger.debug(`Tenant Personalization success fetched by uuid : ${domain} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  // agent on break
  async putAgentOnBreak(uuid, body) {
    console.log("Inside serviceee")
    const { tenant_uuid, name, duration } = body
    console.log("Inside serviceee boidy", body)

    await this.agent_live_report.updateOne(
      {
        $and: [
          { tenant_uuid: tenant_uuid },
          { agent_uuid: uuid },
          { status: { $ne: "6" } },
          { agent_logged_in_time: { $regex: this.commonFn.getTodayDate(), $options: 'i' } }
        ]
      },
      {
        $set: {
          break_name: name,
          break_duration: duration,
        }
      }
    );


    this.socketService.emitToAgent(uuid, {
      type: 'BREAK',
      payload: { status: 'break', ...body }
    });

    return {
      success: true,
      message: 'Agent put on break successfully',
      uuid,
      breakData: body,
    };
  }

  async putAgentOffBreak(uuid, body) {
    // console.log("Inside serviceee")
    const { tenant_uuid, break_name } = body

    await this.agent_live_report.updateOne(
      {
        $and: [
          { tenant_uuid: tenant_uuid },
          { agent_uuid: uuid },
          { status: { $ne: "6" } },
          { agent_logged_in_time: { $regex: this.commonFn.getTodayDate(), $options: 'i' } }
        ]
      },
      {
        $set: {
          break_name: "",
          break_duration: ""
        }
      }
    );

    this.socketService.emitToAgent(uuid, {
      type: 'OFF_BREAK',
      payload: { status: 'off_break', ...body }
    });

    return {
      success: true,
      message: 'Agent removed from break successfully',
      uuid,
      breakData: body,
    };
  }

  async generateWabaSsoToken(user: any) {
    let tenant_uuid = user.tenant_uuid;
    let agent_uuid = user.uuid;

    if (user.role === 'tenant') {
        tenant_uuid = user.uuid;
        agent_uuid = user.uuid; 
    }

    const tenantDoc = await this.tenant.findOne({ uuid: tenant_uuid }, { vendor_token: 1, vendor_uid: 1 });
    if (!tenantDoc || !tenantDoc.vendor_token || !tenantDoc.vendor_uid) {
       Logger.error(`Vendor token/UID not configured for tenant: ${tenant_uuid}`);
       throw new NotFoundException("Vendor token or vendor UID not configured for this tenant.");
    }
    
    const agentDoc = await this.user.findOne({ uuid: agent_uuid }, { team_user_uid: 1 });
    if (!agentDoc || !agentDoc.team_user_uid) {
       Logger.error(`Team user UID not configured for agent: ${agent_uuid}`);
       throw new NotFoundException("Team user UID not configured for this agent.");
    }

    try {
        const payload = {
            vendor_id: tenantDoc.vendor_uid,
            user_id: agentDoc.team_user_uid
        };

        const response = await axios.post('https://omni.justtawk.com/api/sso/waba/token', payload, {
            headers: {
                'Authorization': `Bearer ${tenantDoc.vendor_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.success) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, response.data);
        } else {
            Logger.error(`Failed to generate token, API response: ${JSON.stringify(response.data)}`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, "Failed to generate token");
        }
    } catch (error) {
        Logger.error("SSO Token Generation Error: " + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, "Error generating SSO token from vendor");
    }
  }

  async syncWaba(uuid: string) {
    const tenant = await this.tenant.findOne({ uuid }).exec();
    if (!tenant) {
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Tenant not found");
    }

    if (await this.checkWhatsappPermission(tenant.role_uuid)) {
      try {
          await this.tenantRabbitmqService.syncManual('tenant.created', tenant);
          return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Tenant synced successfully with external application");
      } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred during sync";
          return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Sync failed: ${errorMessage}`);
      }
    } else {
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.FORBIDDEN, "WhatsApp permission not enabled for this tenant");
    }
  }

}

