import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ActivityLogDocument, ActivityLogSchema } from "../schema/activity-log.schema";
import { CommonDBFunctions } from "../../common/common_db_functions";
import * as moment from 'moment-timezone';
import { HttpStatus } from "@nestjs/common";
import { ManagerRoleDocument, ManagerRoleSchema } from "../../manager-role/schema/manager-role.schema";
import { ManagerDocument, ManagerSchema } from "../../manager/schema/manager.schema";
import { TenantDocument, TenantSchema } from "../../tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "../../user/schema/user.schema";
import { MasterAdmin, MasterAdminDocument } from "../../master-admin/schema/master-admin";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "../../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignDocument, InboundCampaignSchema } from "../../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../../campaigns/blended-campaign/schema/blended-campaign.schema";
import { VoiceBroadcastDocument, VoiceBroadcastSchema } from "../../voice-broadcast/schema/voice-broadcast.schema";

@Injectable()
export class ActivityLogService {
    constructor(
        @InjectModel(ActivityLogSchema.name) private activityLogModel: Model<ActivityLogDocument>,
        @InjectModel(ManagerRoleSchema.name) private readonly manager_role: Model<ManagerRoleDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(MasterAdmin.name) private readonly masterAdmin: Model<MasterAdminDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(InboundCampaignSchema.name) private readonly inbound_campaign: Model<InboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(VoiceBroadcastSchema.name) private readonly voice_broadcast: Model<VoiceBroadcastDocument>,

        private readonly commonDbFn: CommonDBFunctions
    ) { }

    async createLog(logData: any): Promise<void> {
        try {
            // Populate names before saving
            const { user_uuid, tenant_uuid, campaign_uuid, role } = logData;

            let user_name = "N/A";
            let tenant_name = "N/A";
            let campaign_name = "N/A";

            // 1. Fetch User/Manager Name
            if (user_uuid) {
                if (role === 'master_admin') {
                    const ma = await this.masterAdmin.findOne({ master_admin_uuid: user_uuid }, { username: 1 }).lean().exec();
                    user_name = ma?.username ? String(ma.username) : "N/A";
                } else if (role === 'tenant') {
                    const ten = await this.tenant.findOne({ uuid: user_uuid }, { tenant_name: 1, username: 1 }).lean().exec();
                    const tName = ten?.tenant_name;
                    user_name = tName ? String(tName) : (ten?.username ? String(ten.username) : "N/A");
                } else if (role === 'manager') {
                    const mgr = await this.manager.findOne({ uuid: user_uuid }, { first_name: 1, last_name: 1, username: 1 }).lean().exec();
                    const firstName = mgr?.first_name || '';
                    const lastName = mgr?.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    user_name = fullName || (mgr?.username ? String(mgr.username) : "N/A");
                } else {
                    const usr = await this.user.findOne({ uuid: user_uuid }, { fullname: 1, username: 1 }).lean().exec();
                    const fullName = usr?.fullname;
                    user_name = fullName ? String(fullName) : (usr?.username ? String(usr.username) : "N/A");
                }
            }

            // 2. Fetch Tenant Name
            if (tenant_uuid) {
                if (role === 'master_admin' && tenant_uuid === user_uuid) {
                    tenant_name = "N/A";
                } else {
                    const ten = await this.tenant.findOne({ uuid: tenant_uuid }, { tenant_name: 1, username: 1 }).lean().exec();
                    const tName = ten?.tenant_name;
                    tenant_name = tName ? String(tName) : (ten?.username ? String(ten.username) : "N/A");
                }
            }

            // 3. Fetch Campaign Name
            if (campaign_uuid) {
                const [outbound, inbound, blended, broadcast] = await Promise.all([
                    this.outbound_campaign.findOne({ uuid: campaign_uuid }, { name: 1 }).lean().exec(),
                    this.inbound_campaign.findOne({ uuid: campaign_uuid }, { name: 1 }).lean().exec(),
                    this.blended_campaign.findOne({ uuid: campaign_uuid }, { name: 1 }).lean().exec(),
                    this.voice_broadcast.findOne({ uuid: campaign_uuid }, { name: 1 }).lean().exec(),
                ]);
                const campaign = outbound || inbound || blended || broadcast;
                const cName = campaign?.name;
                campaign_name = cName ? String(cName) : "N/A";
            }

            const newLog = new this.activityLogModel({
                ...logData,
                user_name,
                tenant_name,
                campaign_name
            });
            await newLog.save();
        } catch (error) {
            // Silently fail to not interrupt the main request flow
            Logger.error("Error saving activity log:", error);
        }
    }

    async findAll(queryParams: any): Promise<any> {
        let query: any = {}, checkRole: any = {}, filterDate: any = {}, result, totalCount = 0;
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        let pagination = true;

        // --- 1. Construct Base Query (Search & Filters) ---

        // Basic Filters
        if (queryParams.module) query.module = { $regex: queryParams.module, $options: 'i' };
        if (queryParams.action) query.action = { $regex: queryParams.action, $options: 'i' };
        if (queryParams.method) query.method = queryParams.method;
        if (queryParams.status_code) query.status_code = Number(queryParams.status_code);
        if (queryParams.ip_address) query.ip_address = { $regex: queryParams.ip_address, $options: 'i' };
        if (queryParams.browser) query.browser = { $regex: queryParams.browser, $options: 'i' };

        // This is the new filter logic we want to support properly
        if (queryParams.filter_role) query.role = queryParams.filter_role;

        // Date Range
        if (queryParams.from_date || queryParams.to_date) {
            query.createdAt = {};
            if (queryParams.from_date) query.createdAt.$gte = moment(queryParams.from_date).toDate();
            if (queryParams.to_date) query.createdAt.$lte = moment(queryParams.to_date).toDate();
        }

        // Generic Search
        if (queryParams.search) {
            const searchFields = ["user_uuid", "action", "module", "role", "ip_address", "browser", "location", "user_name", "campaign_name", "tenant_name"];
            const searchParams = searchFields.map(field => ({ [field]: { '$regex': queryParams.search, '$options': 'i' } }));

            if (Object.keys(query).length > 0) {
                query = { '$and': [{ '$or': searchParams }, query] };
            } else {
                query = { '$or': searchParams };
            }
        }

        // Payload Search
        if (queryParams.payloadSearch) {
            const payloadSearch = String(queryParams.payloadSearch).toLowerCase();
            const payloadQuery = {
                $where: `function() { 
                    return JSON.stringify(this.payload || {}).toLowerCase().includes("${payloadSearch.replace(/"/g, '\\"')}"); 
                }`
            };

            if (query.$and) {
                query.$and.push(payloadQuery);
            } else if (Object.keys(query).length > 0) {
                query = { $and: [query, payloadQuery] };
            } else {
                query = payloadQuery;
            }
        }

        // --- 2. Access Control (Security) ---
        // This logic ensures users only see what they are allowed to see based on THEIR role.
        let { role, tenant_uuid, uuid, manager_uuid, assigned_manager_role, module } = queryParams;

        if (role === 'master_admin') {
            // Master Admin sees everything (or can be filtered by the UI filters above)
            checkRole = {};
        } else if (role === 'tenant') {
            // Tenant sees their own actions OR actions of their agents/managers
            // But strict filtering by role is handled by query.role above if set
            checkRole = { $or: [{ user_uuid: uuid }, { tenant_uuid: uuid }] };
        } else if (role === 'manager') {
            checkRole = { $or: [{ user_uuid: uuid }, { tenant_uuid: tenant_uuid }] };
            // Manager specific logic for assigned roles could be added here if strictly needed for activity log
        } else if (role === 'agent') {
            checkRole = { user_uuid: uuid };
        }

        // --- 3. Execute Query & Pagination ---

        if (((!queryParams.limit) || (queryParams.limit == "")) && ((!queryParams.page) || (queryParams.page == ""))) {
            pagination = false;
        }

        let queryExec = this.activityLogModel.find({ $and: [query, checkRole] }).sort({ _id: -1 });

        if (pagination) {
            queryExec = queryExec.limit(perPage).skip(skip);
        }

        result = await queryExec.lean().exec();

        if (pagination) {
            totalCount = await this.activityLogModel.find({ $and: [query, checkRole] }).count().exec();
        } else {
            totalCount = result.length;
        }
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, totalCount);
    }
}
