import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as moment from "moment-timezone";
import { Model, PipelineStage } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { CallOverviewDto } from "../dto/call-overview.dto";
import { CdrsSummaryDocument, CdrsSummarySchema } from "src/modules/cdrs/schema/cdrs-summary.schema";
let osu = require('node-os-utils');
let cpu = osu.cpu;
const si = require('systeminformation');
import * as xml2js from "xml2js";
import * as esl from "modesl";
import { TenantCallOverviewDto } from "../dto/tenant-call-overview.dto";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { InboundCampaignDocument, InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { DidDocument, DidSchema } from "src/modules/did/schema/did.schema";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { CallQueueDocument, CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { AgentLoginLogoutDocument, AgentLoginLogoutSchema } from "src/modules/call-center/schema/agent-login-logout.schema";
import { IdleStateAgentDocument, IdleStateAgentSchema } from "src/modules/call-center/schema/idle-state-agent.schema";

//https://medium.com/voodoo-engineering/node-js-and-cpu-profiling-on-production-in-real-time-without-downtime-d6e62af173e2

@Injectable()

export class DashboardService {

    constructor(
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions,
        @InjectModel("extension") private readonly extension: Model<ExtensionDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(CdrsSummarySchema.name) private readonly cdrs_summary: Model<CdrsSummaryDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        @InjectModel(InboundCampaignSchema.name) private readonly inbound_campaign: Model<InboundCampaignDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(DidSchema.name) private readonly did: Model<DidDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly leadsModel: Model<LeadManagementDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly leadGroupModel: Model<LeadGroupDocument>,
        @InjectModel(CallQueueSchema.name) private readonly callQueueModel: Model<CallQueueDocument>,
        @InjectModel(AgentLoginLogoutSchema.name) private readonly agent_login_logout_report: Model<AgentLoginLogoutDocument>,
        @InjectModel(IdleStateAgentSchema.name) private readonly idle_state_agent: Model<IdleStateAgentDocument>,
    ) { }

    /*
    @Usage              : To get admin dashboard details
    @return             : Array of an object with all dashboard details
    */

    async getAdminDashboardDetails(queryParams) {
        let obj = {}, dashboardDetailsArr = [];
        let liveCalls = await this.getLiveCalls();
        let managers = await this.getManagersData();
        let agents = await this.getAgentsData();
        let dids = await this.getDidData();
        let trunks = await this.getTrunkData();
        let inbound_campaigns = await this.getInboundCampaignData();
        let outbound_campaigns = await this.getOutboundCampaignData();
        let blended_campaigns = await this.getBlendedCampaignData();
        let totalExtensions = await this.getTotalRegisterExtension();
        let top10Tenant = await this.getTop10Tenant("", queryParams);
        let recent10Tenant = await this.getRecent10Tenant("", queryParams);
        let cpuUsage: any = await this.getCpuUsage();
        let memoryUsage = await this.getMemoryUsage();
        let diskUsage = await this.diskUsage();
        let callOverviewData = await this.getCallOverviewData("", queryParams);
        obj = {
            live_calls: liveCalls,
            managers: managers,
            agents: agents,
            dids: dids,
            trunks: trunks,
            inbound_campaigns: inbound_campaigns,
            outbound_campaigns: outbound_campaigns,
            blended_campaigns: blended_campaigns,
            total_extension: totalExtensions,
            call_overview: callOverviewData,
            top10_tenant: top10Tenant,
            recent10_tenant: recent10Tenant,
            cpu_usage: cpuUsage,
            disk_usage: diskUsage,
            memory_usage: memoryUsage
        }
        dashboardDetailsArr.push(obj);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, dashboardDetailsArr);
    }

    /*
    @Usage              : To get managers
    @return             : Count of managers
    */

    async getManagersData(queryParam: any = "") {

        // console.log("queryParam",queryParam);
        const { tenant_uuid } = queryParam
        let managers: any = await this.manager.find({ tenant_uuid }).count().exec()

        let managerArr = [];
        managerArr.push({ "managers": managers });
        return managers;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, managerArr);

    }

    /*
    @Usage              : To get agents
    @return             : Count of agnets
    */

    async getAgentsData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let agents: any = await this.user.find({ tenant_uuid }).count().exec()

        let agentArr = [];
        agentArr.push({ "agents": agents });
        return agents;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, agentArr);

    }

    /*
    @Usage              : To get DID numbers
    @return             : Count of DID numbers
    */

    async getDidData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let dids: any = await this.did.find({ tenant_uuid }).count().exec()

        let didArr = [];
        didArr.push({ "dids": dids });
        return dids
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, didArr);

    }

    /*
    @Usage              : To get trunks
    @return             : Count of trunks
    */

    async getTrunkData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let trunks: any = await this.trunk.find({ tenant_uuid }).count().exec()

        let trunksArr = [];
        trunksArr.push({ "trunks": trunks });
        return trunks;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, trunksArr);

    }

    /*
    @Usage              : To get inbound campaign
    @return             : Count of inbound campaigns
    */

    async getInboundCampaignData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let inbound_campaigns: any = await this.inbound_campaign.find({ tenant_uuid }).count().exec()

        let inboundCampaignsArr = [];
        inboundCampaignsArr.push({ "inbound_campaigns": inbound_campaigns });
        return inbound_campaigns;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, inboundCampaignsArr);

    }

    /*
    @Usage              : To get outbound campaign
    @return             : Count of outbound campaign
    */

    async getOutboundCampaignData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let outbound_campaigns: any = await this.outbound_campaign.find({ tenant_uuid }).count().exec()

        let outboundCampaignsArr = [];
        outboundCampaignsArr.push({ "outbound_campaigns": outbound_campaigns });
        return outbound_campaigns;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, outboundCampaignsArr);

    }

    /*
    @Usage              : To get blended campaign
    @return             : Count of blended campaign
    */

    async getBlendedCampaignData(queryParam: any = "") {
        const { tenant_uuid } = queryParam
        let blended_campaigns: any = await this.blended_campaign.find({ tenant_uuid }).count().exec()

        let blendedCampaignsArr = [];
        blendedCampaignsArr.push({ "blended_campaigns": blended_campaigns });
        return blended_campaigns;
        // return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, blendedCampaignsArr);

    }

    /*
    @Usage              : To live calls running in freeswitch
    @return             : Array of an object with live calls details
    */

    async getLiveCalls(returnCountOnly: any = "") {
        let liveCalls: any = await this.commonFn.getLiveCalls();
        liveCalls = liveCalls.body.split(" ")[0].replace(/\\n/g, '').trim();
        if (returnCountOnly == "") {
            return liveCalls;
        }
        let liveCallArr = [];
        liveCallArr.push({ "live_calls": liveCalls });

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, liveCallArr);

    }

    /*
    @Usage              : To get total extension
    @return             : Total extension
    */

    async getTotalRegisterExtension(returnCountOnly: any = "") {
        let totalExtension: any = await this.commonFn.getSipRegistrationCount();
        totalExtension = totalExtension.body.split(" ")[0].replace(/\\n/g, '').trim();
        if (returnCountOnly == "") {
            return totalExtension;
        }
        let totalExtensionArr = [];
        totalExtensionArr.push({ "total_extension": totalExtension });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, totalExtensionArr);
    }

    /*
    @Usage              : To get top 10 tenant
    @return             : Array of an object with tenant detail
    */

    async getTop10Tenant(returnCountOnly: any = "", queryParam: any = "") {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", count: { $sum: 1 }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }

        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$createdAt', new Date(start_date)] }, { $lte: ['$createdAt', new Date(end_date + 'T23:59:59Z')] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }

        let matchFileds = {
            $expr: {
                $and: whereFileds
                /*$and: [
                    {
                        $gte: ['$createdAt', new Date(start_date)]
                    }, {
                        $lte: ['$createdAt', new Date(end_date + 'T23:59:59Z')],
                    },
                ],*/
            },
        }
        let result = await this.commonDbFn.fetchDataByGroup(this.user, matchFileds, lookupDetails, groupByDetails, { "count": -1 }, 10);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let top10Tenant = [];
        top10Tenant.push({ "top10_tenant": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, top10Tenant);
    }

    /*
    @Usage              : To get recently 10 tenant
    @return             : Array of an object with tenant detail
    */

    async getRecent10Tenant(returnCountOnly: any = "", queryParam: any = "") {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", count: { $sum: 1 }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }

        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$createdAt', new Date(start_date)] }, { $lte: ['$createdAt', new Date(end_date + 'T23:59:59Z')] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }

        let matchFileds = {
            $expr: {
                $and: whereFileds
                /*$and: [
                    {
                        $gte: ['$createdAt', new Date(start_date)]
                    }, {
                        $lte: ['$createdAt', new Date(end_date + 'T23:59:59Z')],
                    },
                ],*/
            },
        }

        let result = await this.commonDbFn.fetchDataByGroup(this.user, matchFileds, lookupDetails, groupByDetails, { "createdAt": -1 }, 10);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let recent10Tenant = [];
        recent10Tenant.push({ "recent10_tenant": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, recent10Tenant);

    }

    /*
    @Usage              : To get cpu usage
    @return             : cpu usage in %
    */

    async getCpuUsage() {
        let res = await cpu.usage();
        return `${res}%`;
    }

    /*
    @Usage              : To get memory usage
    @return             : memory usage in %
    */

    async getMemoryUsage() {
        let res = await si.mem();
        res = 100 - (((res.free + res.buffcache) * 100) / res.total);
        return `${Math.round(res)}%`;
    }

    /*
    @Usage              : To get mount / disk usage
    @return             : disk usage in %
    */

    async diskUsage() {
        let res = await si.fsSize();
        return `${Math.round(res[0].use)}%`; // take only mount / disk partition
    }

    /*
    @Usage              : To get call overview data
    @return             : Array of an object with calls data
    */

    //async getCallOverviewData(callOverviewDto: CallOverviewDto, returnCountOnly: any = "") {
    // const { by_tenant, start_date, end_date, role } = callOverviewDto;
    async getCallOverviewData(returnCountOnly: any = "", queryParams) {
        const { by_tenant, start_date, end_date } = queryParams;
        let matchFileds = [];


        //Add date filter in query
        matchFileds.push({ "date": { "$gte": `${start_date}`, "$lte": `${end_date}` } });

        if (by_tenant !== "" && by_tenant !== undefined) {
            matchFileds.push({ tenant_uuid: by_tenant });
        }

        let result = await this.cdrs_summary.aggregate([
            {
                $match: { $and: matchFileds, user_uuid: { $ne: "" } },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                        //direction: "$direction",
                    },
                    success: { $sum: "$success" },
                    fail: { $sum: "$fail" },
                    total: { $sum: { $add: ["$success", "$fail"] } }
                }
            },
            {
                $sort: { "_id.date": 1 }
            }
        ]);
        if (returnCountOnly == "") {
            return result;
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);

    }

    /*
    @Usage              : To get top 10 tenant usage by billsecond
    @return             : Array of an object with calls data
    */

    async getTop10TenantUsage(queryParam) {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", billsecond: { $sum: "$billsecond" }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }
        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$date', start_date] }, { $lte: ['$date', end_date] }, { $ne: ['$user_uuid', ""] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }

        let matchFileds = {
            $expr: {
                $and: whereFileds
                /* $and: [
                     {
                         $gte: ['$date', start_date]
                     }, {
                         $lte: ['$date', end_date],
                     },
             { $ne: [ '$user_uuid', "" ] }
                 ],*/
            },
        }

        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { billsecond: -1 }, 10);
        result = await this.removeBlankData(result);
        let top10TenantUsage = [];
        top10TenantUsage.push({ "top10_tenant_usage": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, top10TenantUsage);
    }

    /*
    @Usage              : To get top 10 tenant by calls
    @return             : Array of an object with calls data
    */

    async getTop10TenantCalls(queryParam) {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", totalCalls: { $sum: "$total" }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }
        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$date', start_date] }, { $lte: ['$date', end_date] }, { $ne: ['$user_uuid', ""] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }
        let matchFileds = {
            $expr: {
                $and: whereFileds
                /*$and: [
                     {
                         $gte: ['$date', start_date]
                     }, {
                         $lte: ['$date', end_date],
                     },
             { $ne: [ '$user_uuid', "" ] },
             { $eq : ['$tenant_uuid',by_tenant]}
                 ],*/
            },
        }

        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { "totalCalls": -1 }, 10);
        result = await this.removeBlankData(result);
        let top10TenantCalls = [];
        top10TenantCalls.push({ "top10_tenant_calls": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, top10TenantCalls);
    }

    /*
    @Usage              : To get recent 10 tenant usage by calls
    @return             : Array of an object with calls data
    */

    async getRecent10TenantUsage(queryParam) {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", billsecond: { $sum: "$billsecond" }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }
        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$date', start_date] }, { $lte: ['$date', end_date] }, { $ne: ['$user_uuid', ""] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }

        let matchFileds = {
            $expr: {
                $and: whereFileds
                /*$and: [
                    {
                        $gte: ['$date', start_date]
                    }, {
                        $lte: ['$date', end_date],
                    },
            { $ne: [ '$user_uuid', "" ] }
                ],*/
            },
        }

        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { createdAt: -1 }, 10);
        result = await this.removeBlankData(result);
        let recent10TenantUsage = [];
        recent10TenantUsage.push({ "recent10_tenant_usage": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, recent10TenantUsage);
    }

    /*
    @Usage              : To get recent 10 tenant usage by calls
    @return             : Array of an object with calls data
    */

    async getRecent10TenantCalls(queryParam) {
        const { start_date, end_date, by_tenant } = queryParam;
        let lookupDetails = { from: "tenant", localField: "tenant_uuid", foreignField: "uuid", as: "tenant" };
        let groupByDetails = {
            _id: "$tenant_uuid", totalCalls: { $sum: "$total" }, "tenant_name": {
                "$first": "$tenant.tenant_name"
            }
        }
        //Add date filter in query
        let whereFileds = [];
        whereFileds.push({ $gte: ['$date', start_date] }, { $lte: ['$date', end_date] }, { $ne: ['$user_uuid', ""] });
        if (by_tenant !== "" && by_tenant !== undefined) {
            whereFileds.push({ $eq: ['$tenant_uuid', by_tenant] });
        }

        let matchFileds = {
            $expr: {
                $and: whereFileds
                /* $and: [
                     {
                         $gte: ['$date', start_date]
                     }, {
                         $lte: ['$date', end_date],
                     },
             { $ne: [ '$user_uuid', "" ] }
                 ],*/
            },
        }

        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { createdAt: -1, "totalCalls": -1 }, 10);
        result = await this.removeBlankData(result);
        let recent10TenantCalls = [];
        recent10TenantCalls.push({ "recent10_tenant_calls": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, recent10TenantCalls);
    }

    /****************** Tenant Dashboard Section **************************/

    async getTotalTenantExtension(returnCountOnly: any = "", queryParams) {
        const { tenant_uuid } = queryParams;
        let registration = 0, tenantDomain, loggedInUserUUID;
        //let { domain }: any = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1, _id: 0 }).exec();
        let tenantData: any = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1, _id: 0 }).exec();
        let domain = tenantData?.domain;
        let totalExtension = await this.parseXML("show registrations as xml");
        let data = totalExtension["result"]["row"];
        if (data != undefined) {
            data?.map(async (item, i) => {

                tenantDomain = item.realm[0]; // tenant domain
                if (tenantDomain == domain && queryParams.role == "tenant") {
                    registration = registration + 1;
                }
            });
        }
        if (returnCountOnly == "") {
            return registration;
        }
        let totalExtensionArr = [];
        totalExtensionArr.push({ "total_extension": registration });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, totalExtensionArr);
    }

    async getTenantDashboardDetails(queryParams) {
        let obj = {}, dashboardDetailsArr = [];
        let liveCallsTenant = await this.getLiveCallsForTenant("", queryParams);
        let managers = await this.getManagersData(queryParams);
        let agents = await this.getAgentsData(queryParams);
        let dids = await this.getDidData(queryParams);
        let trunks = await this.getTrunkData(queryParams);
        let inbound_campaigns = await this.getInboundCampaignData(queryParams);
        let outbound_campaigns = await this.getOutboundCampaignData(queryParams);
        let blended_campaigns = await this.getBlendedCampaignData(queryParams);

        obj = {
            live_calls: liveCallsTenant,
            managers: managers,
            agents: agents,
            dids: dids,
            trunks: trunks,
            inbound_campaigns: inbound_campaigns,
            outbound_campaigns: outbound_campaigns,
            blended_campaigns: blended_campaigns,
            total_extension: await this.getTotalTenantExtension("", queryParams),
            calls_data: await this.getCallsDataForTenant(queryParams),
            call_overview: await this.getCallOverviewDataForTenant(queryParams),
            top10_users: await this.getTop10Users("", queryParams),
            recent10_users: await this.getRecent10Users("", queryParams)

        }
        dashboardDetailsArr.push(obj);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, dashboardDetailsArr);
    }

    /*********** Top 10 User Section Start **************/

    /*
    @Usage              : To get top 10 users
    @return             : Array of an object with tenant detail
    */

    async getTop10Users(returnCountOnly: any = "", queryParams: any = "", byDirection = false) {
        let { tenant_uuid, start_date, end_date, by_user } = queryParams;
        let matchFileds = this.addDateFilter(tenant_uuid, start_date, end_date, by_user);
        let lookupDetails = { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user" };
        let groupByDetails = {
            _id: "$user_uuid",
            count: { $sum: "$billsecond" }, "username": {
                "$first": "$user.username"
            }
        }
        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { "count": -1 }, 10);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let top10Users = [];
        top10Users.push({ "top10_users": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, top10Users);

    }

    /*
    @Usage              : To get top 10 tenant by calls
    @return             : Array of an object with calls data
    */

    async getTop10UserCalls(returnCountOnly: any = "", queryParams: any = "") {
        let { tenant_uuid, start_date, end_date, by_user } = queryParams;
        let lookupDetails = { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user" };
        let groupByDetails = {
            _id: "$user_uuid", totalCalls: { $sum: "$total" }, "username": {
                "$first": "$user.username"
            }
        }
        let matchFileds = this.addDateFilter(tenant_uuid, start_date, end_date, by_user);
        let projection = { _id: 0 };
        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { "totalCalls": -1 }, 10, projection);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let top10UsersCalls = [];
        top10UsersCalls.push({ "top10_users_calls": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, top10UsersCalls);
    }

    /*********** Top 10 User Section End **************/


    /*********** Recent 10 User Section Start **************/

    /*
    @Usage              : To get recent 10 users
    @return             : Array of an object with user detail
    */

    async getRecent10Users(returnCountOnly: any = "", queryParams: any = "", byDirection = false) {
        let { tenant_uuid, start_date, end_date, by_user } = queryParams;
        let lookupDetails = { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user" };
        let groupByDetails = {
            _id: "$user_uuid", count: { $sum: "$billsecond" }, "username": {
                "$first": "$user.username"
            }
        }
        let matchFileds = this.addDateFilter(tenant_uuid, start_date, end_date, by_user);
        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { date: -1 }, 10);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let recent10Users = [];
        recent10Users.push({ "recent10_users": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, recent10Users);

    }

    /*
    @Usage              : To get top 10 tenant by calls
    @return             : Array of an object with calls data
    */

    async getRecent10UserCalls(returnCountOnly: any = "", queryParams: any = "") {
        let { tenant_uuid, start_date, end_date, by_user } = queryParams;
        let lookupDetails = { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user" };
        let groupByDetails = {
            _id: "$user_uuid", totalCalls: { $sum: "$total" }, "username": {
                "$first": "$user.username"
            }
        }
        let matchFileds = this.addDateFilter(tenant_uuid, start_date, end_date, by_user);
        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, lookupDetails, groupByDetails, { createdAt: -1, "totalCalls": -1 }, 10);
        if (returnCountOnly == "") {
            return this.removeBlankData(result);
        }
        result = await this.removeBlankData(result);
        let recent10UserCalls = [];
        recent10UserCalls.push({ "recent10_users_calls": result });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, recent10UserCalls);
    }

    /*********** Recent 10 User Section End **************/


    /*********** Calls block Section Start **************/

    async getCallsDataForTenant(loggedInUserInfo) {
        let total = 0, totalIncoming = 0, totalOutgoing = 0, failedOutgoing = 0, calls_data = [];
        let { tenant_uuid, start_date, end_date, by_user } = loggedInUserInfo;
        //let matchFileds = { tenant_uuid };
        let matchFileds = this.addDateFilter(tenant_uuid, start_date, end_date, by_user);
        let groupByDetails = {
            _id: { date: "$date", direction: "$direction" }, total: { $sum: "$success" },
            fail: { $sum: "$fail" }
        }
        let projection = { direction: 1, fail: 1, success: 1, total: 1, billsecond: 1 };
        let result = await this.commonDbFn.fetchDataByGroup(this.cdrs_summary, matchFileds, "", groupByDetails, "", 10, projection);

        result?.map((data) => {
            total = total + data.total;
            if (data._id.direction == "inbound") {
                totalIncoming = totalIncoming + data.total;
            }
            if (data._id.direction == "outbound") {
                totalOutgoing = totalOutgoing + data.total;
                failedOutgoing = failedOutgoing + data.fail;
            }
        });
        let failedIncoming = await this.cdrs.find({ $and: [{ call_state: "missed" }, { tenant_uuid }, { callstart: { "$gte": `${start_date}`, "$lte": `${end_date}` } }] }).count().exec();
        calls_data.push({
            total,
            totalIncoming,
            totalOutgoing,
            failedIncoming,
            failedOutgoing
        })
        return calls_data;
    }

    /*********** Calls block Section End **************/


    /*********** Calls Overview Section Start **************/


    /*
    @Usage              : To get call overview data
    @return             : Array of an object with calls data
    */

    async getCallOverviewDataForTenant(tenantCallOverviewDto: TenantCallOverviewDto, returnCountOnly: any = "", byDirection = false) {
        let { by_user, start_date, end_date, tenant_uuid }: any = tenantCallOverviewDto;
        let matchFileds = [];

        //Add date filter in query
        matchFileds.push({ "date": { "$gte": `${start_date}`, "$lte": `${end_date}` } }, { tenant_uuid });

        if (by_user !== "" && by_user !== undefined) {
            matchFileds.push({ user_uuid: by_user });
        }


        let result = await this.cdrs_summary.aggregate([
            {
                $match: { $and: matchFileds, user_uuid: { $ne: "" } },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                    },
                    success: { $sum: "$success" },
                    fail: { $sum: "$fail" },
                    total: { $sum: { $add: ["$success", "$fail"] } }
                }
            },
            {
                $sort: { "_id.date": 1 }
            }
        ]);
        if (returnCountOnly == "") {
            return result;
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    /*********** Calls Overview Section End **************/

    /*
    @Usage              : To get live calls for tenant
    @return number      : totalcalls
    */

    async getLiveCallsForTenant(returnCountOnly: any = "", queryParams) {
        let liveCalls = 0, presenceData, loggedInUserUUID;
        let callsData = await this.parseXML("show calls as xml");
        let data = callsData["result"]["row"];
        if (data != undefined) {
            data?.map(async (item, i) => {

                presenceData = item.presence_data[0].split(","); // tenant_uuid
                loggedInUserUUID = presenceData[0] != undefined ? presenceData[0].split("=")[1] : "";
                if (queryParams.tenant_uuid == loggedInUserUUID && queryParams.role == "tenant") {
                    liveCalls = liveCalls + 1;
                }
            });
        }

        if (returnCountOnly == "") return liveCalls;

        let liveCallArr = [];
        liveCallArr.push({ "live_calls": liveCalls });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, liveCallArr);

    }

    /*
    @Usage       : To parse live calls XML
    @return      : Array of an object
    */

    async parseXML(command) {
        let conn, xml, self = this;
        const parser = new xml2js.Parser({ attrkey: "ATTR" });
        return new Promise(async function (resolve, reject) {
            //conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn = await self.commonFn.fetchFsConnection();
            conn.api(`${command}`, function (res) {
                xml = res.getBody().trim();
                parser.parseString(xml, function (err, result) {
                    if (err === null) {
                        resolve(result);
                    } else {
                        reject(err);
                        console.log(err, "Error in live calls");
                    }
                })
            })
            // resolve("")
            // })
        });
    }

    /*
    @Usage       : To remove blank data
    @return      : Array
    */

    async removeBlankData(result) {
        let finalData = [];
        result?.map((data) => {
            if (data.tenant_name?.length > 0 || data.username?.length > 0) {
                finalData.push(data);
            }
        });
        return finalData;
    }

    /*
    @Usage       : To add date filter
    @return      : Array
    */

    addDateFilter(tenant_uuid, start_date, end_date, by_user) {
        //let matchFileds: any = { $expr: { '$and': [ { '$gte': [ '$date', start_date ] }, { '$lte': [ '$date', end_date ] } , {$eq: ['$tenant_uuid', tenant_uuid] }  ] }   };
        let whereFileds = [];
        whereFileds.push({ $gte: ['$date', start_date] }, { $lte: ['$date', end_date] }, { $eq: ['$tenant_uuid', tenant_uuid] });
        if (by_user !== "" && by_user !== undefined) {
            whereFileds.push({ $eq: ['$user_uuid', by_user] });
        } else {
            whereFileds.push({ $ne: ['$user_uuid', ""] });
        }
        let matchFileds = { $expr: { $and: whereFileds } };
        return matchFileds;
    }

    async getCardsCountData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };
        let blendedCount = await this.blended_campaign.countDocuments(matchFileds).exec();
        let outboundCount = await this.outbound_campaign.countDocuments(matchFileds).exec();
        let inboundCount = await this.inbound_campaign.countDocuments(matchFileds).exec();
        let leadGroupCount = await this.leadGroupModel.countDocuments(matchFileds).exec();
        let callCount = await this.cdrs_summary.countDocuments({ ...matchFileds, direction: { $in: ["inbound", "outbound"] } }).exec();
        let managersCount = await this.manager.countDocuments(matchFileds).exec();
        let agentsCount = await this.user.countDocuments(matchFileds).exec();
        let didsCount = await this.did.countDocuments(matchFileds).exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, {
            blendedCount,
            outboundCount,
            inboundCount,
            leadGroupCount,
            callCount,
            managersCount,
            agentsCount,
            didsCount
        });
    }

    async getCampaignData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };

        const buildPipeline = (typeLabel: string): PipelineStage[] => ([
            { $match: matchFileds },
            { $addFields: { createdAtDate: { $toDate: "$createdAt" }, updatedAtDate: { $toDate: "$updatedAt" }, name: "$name" } },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    type: { $literal: typeLabel },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
                    last_activity: {
                        $let: {
                            vars: {
                                diffHours: { $divide: [{ $subtract: ["$updatedAtDate", "$createdAtDate"] }, 3600000] }
                            },
                            in: {
                                $cond: [
                                    { $lt: ["$$diffHours", 24] },
                                    { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
                                    { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $sort: { createdAtDate: -1 }
            }
        ]);

        // 🚀 Run both in parallel (faster)
        const [blended, outbound, inbound] = await Promise.all([
            this.blended_campaign.aggregate(buildPipeline("Blended Campaign")),
            this.outbound_campaign.aggregate(buildPipeline("Outbound Campaign")),
            this.inbound_campaign.aggregate(buildPipeline("Inbound Campaign")),
        ]);

        // 🔥 Merge into single array
        const finalResult = [...blended, ...outbound, ...inbound].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, finalResult);
    }

    async getLeadGroupData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };

        let result = await this.leadGroupModel.aggregate([
            { $match: matchFileds },
            { $addFields: { createdAtDate: { $toDate: "$createdAt" }, updatedAtDate: { $toDate: "$updatedAt" }, name: "$name" } },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    type: { $literal: "Leads Group" },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
                    last_activity: {
                        $let: {
                            vars: {
                                diffHours: { $divide: [{ $subtract: ["$updatedAtDate", "$createdAtDate"] }, 3600000] }
                            },
                            in: {
                                $cond: [
                                    { $lt: ["$$diffHours", 24] },
                                    { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
                                    { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
                                ]
                            }
                        }
                    }
                }
            },
            { $sort: { createdAtDate: -1 } }
        ]);

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    async getCallQueueData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };

        let result = await this.callQueueModel.aggregate([
            { $match: matchFileds },
            // { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, latestUpdate: { $max: "$updatedAt" } } },
            { $addFields: { createdAtDate: { $toDate: "$createdAt" }, updatedAtDate: { $toDate: "$updatedAt" }, name: "$name" } },
            {
                $project: {
                    _id: 0,
                    // date: "$_id",
                    name: 1,
                    // count: 1,
                    type: { $literal: "Call Queue" },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
                    last_activity: {
                        $let: {
                            vars: {
                                diffHours: { $divide: [{ $subtract: ["$updatedAtDate", "$createdAtDate"] }, 3600000] }
                            },
                            in: {
                                $cond: [
                                    { $lt: ["$$diffHours", 24] },
                                    { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
                                    { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
                                ]
                            }
                        }
                    }
                }
            },
            { $sort: { date: -1 } }
        ]);

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    async getManagerAndAgentsData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };

        // 🔥 Common pipeline builder (DRY)
        // const buildPipeline = (typeLabel: string) => ([
        //     { $match: matchFileds },
        //     {
        //         $group: {
        //             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        //             count: { $sum: 1 },
        //             latestUpdate: { $max: "$updatedAt" }
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: 0,
        //             date: "$_id",
        //             count: 1,
        //             type: { $literal: typeLabel },   // 🔥 dynamic type
        //             last_activity: {
        //                 $let: {
        //                     vars: {
        //                         diffHours: {
        //                             $divide: [
        //                                 { $subtract: ["$latestUpdate", { $dateFromString: { dateString: "$_id" } }] },
        //                                 3600000
        //                             ]
        //                         }
        //                     },
        //                     in: {
        //                         $cond: [
        //                             { $lt: ["$$diffHours", 24] },
        //                             { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
        //                             { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
        //                         ]
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // ]);

        const buildPipeline = (typeLabel: string): PipelineStage[] => ([
            { $match: matchFileds },
            { $addFields: { createdAtDate: { $toDate: "$createdAt" }, updatedAtDate: { $toDate: "$updatedAt" }, name: "$username" } },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    type: { $literal: typeLabel },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
                    last_activity: {
                        $let: {
                            vars: {
                                diffHours: { $divide: [{ $subtract: ["$updatedAtDate", "$createdAtDate"] }, 3600000] }
                            },
                            in: {
                                $cond: [
                                    { $lt: ["$$diffHours", 24] },
                                    { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
                                    { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $sort: { createdAtDate: -1 }
            }
        ]);

        // 🚀 Run both in parallel (faster)
        const [managerResult, agentResult] = await Promise.all([
            this.manager.aggregate(buildPipeline("Manager")),
            this.user.aggregate(buildPipeline("Agent"))
        ]);

        // 🔥 Merge into single array
        const finalResult = [...managerResult, ...agentResult].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, finalResult);
    }

    async getDidsData(queryParams) {
        const { tenant_uuid, start_date, end_date } = queryParams;
        let matchFileds = { tenant_uuid, createdAt: start_date && end_date ? { $gte: new Date(start_date), $lte: new Date(end_date + 'T23:59:59Z') } : { $ne: "" } };

        let result = await this.did.aggregate([
            { $match: matchFileds },
            { $addFields: { createdAtDate: { $toDate: "$createdAt" }, updatedAtDate: { $toDate: "$updatedAt" }, name: "$number" } },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    type: { $literal: "DIDs" },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
                    last_activity: {
                        $let: {
                            vars: {
                                diffHours: { $divide: [{ $subtract: ["$updatedAtDate", "$createdAtDate"] }, 3600000] }
                            },
                            in: {
                                $cond: [
                                    { $lt: ["$$diffHours", 24] },
                                    { $concat: [{ $toString: { $trunc: "$$diffHours" } }, " hours ago"] },
                                    { $concat: [{ $toString: { $trunc: { $divide: ["$$diffHours", 24] } } }, " days ago"] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $sort: { createdAtDate: -1 }
            }
        ]);

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }
    
    async getTenantDashboardData(queryParams: any) {
        const { tenant_uuid, filter = "daily", timezone = "Asia/Kolkata", agent_uuid, campaign_uuid } = queryParams;
        
        let startDate = moment.tz(timezone);
        if (filter === "daily") {
            startDate = moment.tz(timezone).startOf("day");
        } else if (filter === "weekly") {
            startDate = moment.tz(timezone).subtract(7, "days").startOf("day");
        } else if (filter === "monthly") {
            startDate = moment.tz(timezone).subtract(30, "days").startOf("day");
        }
        const endDate = moment.tz(timezone);

        // Build match rules — optionally scope to a specific agent / campaign
        const matchRules: any = {
            tenant_uuid,
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        };
        if (agent_uuid) {
            if (Array.isArray(agent_uuid)) {
                if (agent_uuid.length > 0) {
                    matchRules.user_uuid = { $in: agent_uuid };
                }
            } else {
                matchRules.user_uuid = agent_uuid;
            }
        }
        if (campaign_uuid) {
            if (Array.isArray(campaign_uuid)) {
                if (campaign_uuid.length > 0) {
                    matchRules.campaign_uuid = { $in: campaign_uuid };
                }
            } else {
                matchRules.campaign_uuid = campaign_uuid;
            }
        }

        // Determine target agents based on selected filters
        let targetAgentUuids: string[] = [];
        if (agent_uuid) {
            if (Array.isArray(agent_uuid)) {
                targetAgentUuids = agent_uuid.filter(uuid => !!uuid);
            } else if (typeof agent_uuid === "string" && agent_uuid !== "") {
                targetAgentUuids = [agent_uuid];
            }
        }

        // If no agent filter is applied, but campaign filter is applied:
        if (targetAgentUuids.length === 0 && campaign_uuid) {
            const camps = Array.isArray(campaign_uuid) 
                ? campaign_uuid.filter(uuid => !!uuid) 
                : (typeof campaign_uuid === "string" && campaign_uuid !== "" ? [campaign_uuid] : []);
                
            if (camps.length > 0) {
                // Find users explicitly assigned to or allowed to use the campaigns
                const users = await this.user.find({
                    tenant_uuid,
                    $or: [
                        { campaign_uuid: { $in: camps } },
                        { allowed_campaign: { $in: camps } }
                    ]
                }).select("uuid").lean();
                
                const userUuids = users.map((u: any) => u.uuid);

                // Also find users who took/made calls in these campaigns within the time range
                const activeUsers = await this.cdrs.distinct("user_uuid", {
                    tenant_uuid,
                    campaign_uuid: { $in: camps },
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                });

                const combined = new Set([...userUuids, ...activeUsers.filter(uuid => !!uuid)]);
                targetAgentUuids = Array.from(combined);
            }
        }

        // If still empty (meaning no agent or campaign filter was applied), fallback to all agents of the tenant
        if (targetAgentUuids.length === 0) {
            const agents = await this.user.find({ tenant_uuid }).select("uuid").lean();
            targetAgentUuids = agents.map((a: any) => a.uuid);
        }

        const result = await this.cdrs.aggregate([
            { $match: matchRules },
            {
                $facet: {
                    kpis: [
                        {
                            $group: {
                                _id: null,
                                waiting_time: { $sum: { $toDouble: "$waiting_time" } },
                                hold_time: { $sum: { $toDouble: "$hold_time" } },
                                ringing_time: { $sum: { $toDouble: "$ringing_time" } },
                                billsecond: { $sum: { $toDouble: "$billsecond" } },
                                wrap_up_time: { $sum: { $toDouble: "$wrap_up_time" } }
                            }
                        }
                    ],
                    agentTalk: [
                        {
                            $group: {
                                _id: "$user_uuid",
                                billsecond: { $sum: { $toDouble: "$billsecond" } },
                                hold_time: { $sum: { $toDouble: "$hold_time" } }
                            }
                        }
                    ],
                    inbound: [
                        { $match: { direction: "inbound" } },
                        {
                            $group: {
                                _id: null,
                                total_calls: { $sum: 1 },
                                connected_calls: { 
                                    $sum: { 
                                        $cond: [
                                            { $gt: [{ $convert: { input: "$actual_talktime", to: "double", onError: 0, onNull: 0 } }, 0] }, 
                                            1, 0
                                        ] 
                                    } 
                                },
                                missed_calls: { 
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $lte: [{ $convert: { input: "$actual_talktime", to: "double", onError: 0, onNull: 0 } }, 0] },
                                                    {
                                                        $or: [
                                                            { $eq: ["$call_state", "missed"] },
                                                            { $in: ["$disposition", ["CALLQUEUE_TIMEOUT", "IVR_TIMEOUT", "NO_ANSWER"]] }
                                                        ]
                                                    }
                                                ] 
                                            }, 
                                            1, 0
                                        ] 
                                    } 
                                },
                                dropped_calls: { 
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $lte: [{ $convert: { input: "$actual_talktime", to: "double", onError: 0, onNull: 0 } }, 0] },
                                                    { $ne: ["$call_state", "missed"] },
                                                    { $not: { $in: ["$disposition", ["CALLQUEUE_TIMEOUT", "IVR_TIMEOUT", "NO_ANSWER"]] } }
                                                ] 
                                            }, 
                                            1, 0
                                        ] 
                                    } 
                                }
                             }
                         }
                    ],
                    outbound: [
                        { $match: { direction: "outbound" } },
                        {
                            $group: {
                                _id: null,
                                total_calls: { $sum: 1 },
                                connected_calls: { $sum: { $cond: [{ $gt: [{ $toDouble: "$billsecond" }, 0] }, 1, 0] } },
                                dropped_calls: { $sum: { $cond: [{ $eq: ["$call_state", "missed"] }, 1, 0] } }
                            }
                        }
                    ],
                    traffic_trends: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: { 
                                        format: filter === "daily" ? "%H:00" : "%Y-%m-%d", 
                                        date: "$createdAt",
                                        timezone: timezone
                                    }
                                },
                                inbound: { $sum: { $cond: [{ $eq: ["$direction", "inbound"] }, 1, 0] } },
                                outbound: { $sum: { $cond: [{ $eq: ["$direction", "outbound"] }, 1, 0] } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    disposition_trends: [
                        {
                            $group: {
                                _id: "$disposition",
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    call_distribution: [
                        {
                            $group: {
                                _id: null,
                                ivr: { $sum: { $cond: [{ $ne: ["$ivr_group", ""] }, 1, 0] } },
                                ring_group: { $sum: { $cond: [{ $ne: ["$ring_group", ""] }, 1, 0] } },
                                queue: { $sum: { $cond: [{ $ne: ["$queue_group", ""] }, 1, 0] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const data = result[0];
        const kpiBase = data.kpis[0] || {};
        const agentTalkList = data.agentTalk || [];
        const inb = data.inbound[0] || { total_calls: 0, connected_calls: 0, missed_calls: 0, dropped_calls: 0 };
        const outb = data.outbound[0] || { total_calls: 0, connected_calls: 0, missed_calls: 0, dropped_calls: 0 };
        const trafficData = data.traffic_trends || [];
        const dispTrends = data.disposition_trends || [];

        // Build agent talk map for per-agent calibration
        const agentTalkMap = new Map<string, number>();
        agentTalkList.forEach((item: any) => {
            if (item._id) {
                const talk = (item.billsecond || 0) + (item.hold_time || 0);
                agentTalkMap.set(String(item._id), talk);
            }
        });

        // 1. Process Traffic Trends (Fill all gaps for a consistent timeline)
        const traffic: { labels: string[], inbound: number[], outbound: number[] } = { labels: [], inbound: [], outbound: [] };
        let cursor = startDate.clone();
        
        while (cursor.isSameOrBefore(endDate)) {
            const label = cursor.format(filter === "daily" ? "HH:00" : "YYYY-MM-DD");
            traffic.labels.push(label);
            
            const match = trafficData.find((t: any) => t._id === label);
            traffic.inbound.push(match ? match.inbound : 0);
            traffic.outbound.push(match ? match.outbound : 0);
            
            cursor.add(1, filter === "daily" ? "hour" : "day");
        }

        // 2. Process Disposition Trends
        const totalCalls = (inb.total_calls || 0) + (outb.total_calls || 0);
        const disposition_trends = dispTrends.map((d: any) => ({
            label: d._id || "Unknown",
            value: d.count,
            percent: totalCalls > 0 ? Math.round((d.count / totalCalls) * 100) : 0
        }));

        // 3. Process Call Distribution [Total, Connected, Missed, Dropped]
        const call_distribution = [
            (inb.total_calls || 0) + (outb.total_calls || 0),
            (inb.connected_calls || 0) + (outb.connected_calls || 0),
            (inb.missed_calls || 0) + (outb.missed_calls || 0),
            (inb.dropped_calls || 0) + (outb.dropped_calls || 0)
        ];

        // AHT Calculation
        const talkSec = (kpiBase.billsecond || 0) + (kpiBase.hold_time || 0);
        const ahtSec = talkSec + (kpiBase.wrap_up_time || 0);
        const totalCdrCalls = (inb.total_calls || 0) + (outb.total_calls || 0);

        // Agent state metrics (idle / pause / break / ACW) are agent-scoped:
        // they come from agent_login_logout_report & idle_state_agent which have
        // no campaign dimension.  We compute them for targetAgentUuids and perform per-agent calibration.
        const stateMetrics = await this.getAgentStateMetrics(tenant_uuid, startDate, endDate, agentTalkMap, targetAgentUuids);

        const formattedResponse = {
            kpis: {
                wait_time: this.formatSeconds(kpiBase.waiting_time || 0),
                hold_time: this.formatSeconds(kpiBase.hold_time || 0),
                ring_time: this.formatSeconds(kpiBase.ringing_time || 0),
                aht: this.formatSeconds(ahtSec),
                wrap_up: this.formatSeconds(stateMetrics.acw || kpiBase.wrap_up_time || 0),
                idle_time: this.formatSeconds(stateMetrics.idle),
                pause_time: this.formatSeconds(stateMetrics.pause),
                break_time: this.formatSeconds(stateMetrics.break)
            },
            inbound: inb,
            outbound: outb,
            traffic_trends: traffic,
            disposition_trends: disposition_trends,
            call_distribution: call_distribution,
            filter: filter
        };

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, formattedResponse);
    }

    private formatSeconds(seconds: number): string {
        const duration = moment.duration(seconds, "seconds");
        const h = Math.floor(duration.asHours());
        const m = duration.minutes();
        const s = duration.seconds();
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    private async getAgentStateMetrics(
        tenant_uuid: string,
        startDate: any,
        endDate: any,
        agentTalkMap: Map<string, number>,
        agentUuids: string[]
    ): Promise<{ idle: number, pause: number, break: number, acw: number }> {
        try {
            const start = startDate.toDate();
            const end = endDate.toDate();

            if (agentUuids.length === 0) return { idle: 0, pause: 0, break: 0, acw: 0 };

            // 2. Fetch login/logout and state records
            const [loginResults, stateResults] = await Promise.all([
                this.agent_login_logout_report.find({
                    tenant_uuid,
                    agent_uuid: { $in: agentUuids },
                    createdAt: { $gte: start, $lte: end }
                }).sort({ createdAt: 1 }).lean().exec(),
                this.idle_state_agent.find({
                    tenant_uuid,
                    agent_uuid: { $in: agentUuids },
                    createdAt: { $gte: start, $lte: end }
                }).sort({ createdAt: 1 }).lean().exec()
            ]);

            let totalBreakMs = 0, totalIdleSec = 0, totalPauseSec = 0, totalAcwSec = 0;
            
            const loginByAgent = new Map<string, any[]>();
            loginResults.forEach((r: any) => {
                const auuid = String(r.agent_uuid);
                if (!loginByAgent.has(auuid)) loginByAgent.set(auuid, []);
                loginByAgent.get(auuid).push(r);
            });

            const stateByAgent = new Map<string, any[]>();
            stateResults.forEach((r: any) => {
                const auuid = String(r.agent_uuid);
                if (!stateByAgent.has(auuid)) stateByAgent.set(auuid, []);
                stateByAgent.get(auuid).push(r);
            });

            for (const agentUuid of agentUuids) {
                const auuid = String(agentUuid);
                const agentLogins = loginByAgent.get(auuid) || [];
                totalBreakMs += this.calculateLocalBreakTime(agentLogins, end);

                const agentStates = stateByAgent.get(auuid) || [];
                const cleanedStates = this.cleanLocalStateRecords(agentStates);
                const sessions = this.calculateLocalSessions(agentLogins, end);

                let agentIdle = 0;
                let agentPause = 0;
                let agentAcw = 0;
                let agentStateTalk = 0;

                if (sessions.length > 0 && cleanedStates.length > 0) {
                    const durations = this.calculateLocalStateDurations(sessions, cleanedStates);
                    agentIdle = durations["0"] || 0;
                    agentPause = durations["4"] || 0;
                    agentAcw = durations["5"] || 0;
                    agentStateTalk = (durations["1"] || 0) + (durations["2"] || 0);
                }

                // Calibrate talk-time PER agent!
                const agentCdrTalk = agentTalkMap.get(auuid) || 0;
                const talkDiff = agentCdrTalk - agentStateTalk;
                if (talkDiff > 0) {
                    agentIdle = Math.max(0, agentIdle - talkDiff);
                }

                totalIdleSec += agentIdle;
                totalPauseSec += agentPause;
                totalAcwSec += agentAcw;
            }

            return { idle: totalIdleSec, pause: totalPauseSec, break: totalBreakMs / 1000, acw: totalAcwSec };
        } catch (error) {
            console.error("Error in getAgentStateMetrics:", error);
            return { idle: 0, pause: 0, break: 0, acw: 0 };
        }
    }

    private calculateLocalSessions(alldata: any[], dayEnd: Date) {
        let sessions = [], sessionStart = null, inSession = false;
        for (let i = 0; i < alldata.length; i++) {
            let entry = alldata[i];
            if (entry.login_status == 0 && (entry.breakcode_uuid == "" || entry.breakcode_uuid == undefined)) {
                if (!inSession) { sessionStart = entry.createdAt; inSession = true; }
            } else if (entry.login_status == 2) {
                if (inSession && sessionStart) {
                    let duration = new Date(entry.createdAt).getTime() - new Date(sessionStart).getTime();
                    if (duration > 0) sessions.push({ start: sessionStart, end: entry.createdAt, duration });
                    sessionStart = null; inSession = false;
                }
            }
        }
        if (inSession && sessionStart) {
            let duration = dayEnd.getTime() - new Date(sessionStart).getTime();
            if (duration > 0) sessions.push({ start: sessionStart, end: dayEnd, duration });
        }
        return sessions;
    }

    private calculateLocalBreakTime(alldata: any[], dayEnd: Date) {
        let totalMs = 0;
        for (let i = 0; i < alldata.length; i++) {
            let current = alldata[i], next = alldata[i + 1];
            if (current.login_status == 1 && current.breakcode_uuid) {
                let breakEnd = (next && (next.login_status == 0 || next.login_status == 2)) ? next.createdAt : dayEnd;
                let duration = new Date(breakEnd).getTime() - new Date(current.createdAt).getTime();
                if (duration > 0) totalMs += duration;
            }
        }
        return totalMs;
    }

    private cleanLocalStateRecords(records: any[]) {
        if (!records.length) return [];
        const sorted = [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const dedupedRaw = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i < sorted.length - 1 && new Date(sorted[i].createdAt).getTime() === new Date(sorted[i + 1].createdAt).getTime()) continue;
            dedupedRaw.push(sorted[i]);
        }
        const cleaned = [];
        for (const r of dedupedRaw) {
            if (cleaned.length > 0 && cleaned[cleaned.length - 1].status === r.status) continue;
            cleaned.push(r);
        }
        return cleaned;
    }

    private calculateLocalStateDurations(sessions: any[], states: any[]) {
        const durations: Record<string, number> = {};
        const reversedStates = [...states].reverse();
        for (const session of sessions) {
            const sStart = new Date(session.start).getTime(), sEnd = new Date(session.end).getTime();
            const sessionStates = states.filter(s => {
                const t = new Date(s.createdAt).getTime();
                return t >= sStart && t <= sEnd;
            });
            let lastMarker = sStart, currentStatus = "0";
            const stateBefore = reversedStates.find(s => new Date(s.createdAt).getTime() <= sStart);
            if (stateBefore) currentStatus = String(stateBefore.status);
            else if (sessionStates.length > 0) currentStatus = String(sessionStates[0].status);
            for (const state of sessionStates) {
                const stateTime = new Date(state.createdAt).getTime();
                const d = (stateTime - lastMarker) / 1000;
                if (d > 0) durations[currentStatus] = (durations[currentStatus] || 0) + d;
                currentStatus = String(state.status); lastMarker = stateTime;
            }
            const finalDuration = (sEnd - lastMarker) / 1000;
            if (finalDuration > 0) durations[currentStatus] = (durations[currentStatus] || 0) + finalDuration;
        }
        return durations;
    }

}