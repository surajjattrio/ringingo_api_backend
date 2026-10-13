import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { deleteMethod, getMethod, postMethod, putMethod } from "src/global_constant";
import {
    PipelineLeadDocument,
    PipelineLeadSchema,
    PipelineStageDocument,
    PipelineStageSchema,
    PipelineAssignmentConfigDocument,
    PipelineAssignmentConfigSchema,
} from "../schema/pipeline.schema";
import { CreatePipelineLeadDto, CreatePipelineStageDto, ImportPipelineLeadsDto, UpsertAssignmentConfigDto, BulkUpdatePipelineLeadsDto } from "../dto/pipeline.dto";
import { LeadManagementDocument, LeadManagementSchema } from "../../lead-management/schema/lead-management.schema";
import { DispositionDocument, DispositionSchema } from "../../disposition/schema/disposition.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "../../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../../campaigns/blended-campaign/schema/blended-campaign.schema";
import { InboundCampaignDocument, InboundCampaignSchema } from "../../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { LeadGroupDocument, LeadGroupSchema } from "../../lead-group/schema/lead-group.schema";
import { UserDocument, UserSchema } from "../../user/schema/user.schema";

@Injectable()
export class PipelineService {

    private readonly logger = new Logger(PipelineService.name);

    constructor(
        @InjectModel(PipelineStageSchema.name)              private readonly stageModel:            Model<PipelineStageDocument>,
        @InjectModel(PipelineLeadSchema.name)               private readonly leadModel:             Model<PipelineLeadDocument>,
        @InjectModel(PipelineAssignmentConfigSchema.name)   private readonly assignmentConfigModel: Model<PipelineAssignmentConfigDocument>,
        @InjectModel(LeadManagementSchema.name)             private readonly leadManagementModel:   Model<LeadManagementDocument>,
        @InjectModel(DispositionSchema.name)                private readonly dispositionModel:      Model<DispositionDocument>,
        @InjectModel(OutboundCampaignSchema.name)           private readonly outboundCampaignModel: Model<OutboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name)            private readonly blendedCampaignModel:  Model<BlendedCampaignDocument>,
        @InjectModel(InboundCampaignSchema.name)            private readonly inboundCampaignModel:  Model<InboundCampaignDocument>,
        @InjectModel(LeadGroupSchema.name)                  private readonly leadGroupModel:        Model<LeadGroupDocument>,
        @InjectModel(UserSchema.name)                       private readonly userModel:             Model<UserDocument>,
    ) {}

    /* ═══════════════════════════════════════
       STAGE METHODS
    ═══════════════════════════════════════ */

    async createStage(dto: CreatePipelineStageDto) {
        try {
            const exists = await this.stageModel.findOne({
                name: dto.name,
                tenant_uuid: dto.tenant_uuid,
            });
            if (exists) {
                return { statusCode: HttpStatus.CONFLICT, message: "Stage already exists" };
            }
            const maxOrder = await this.stageModel
                .findOne({ tenant_uuid: dto.tenant_uuid })
                .sort({ sort_order: -1 })
                .lean();
            dto.sort_order = maxOrder ? (maxOrder.sort_order as number) + 1 : 0;

            const stage = await this.stageModel.create(dto);
            this.logger.log(`${postMethod} - Stage created: ${stage.stage_uuid}`);
            return { statusCode: HttpStatus.CREATED, message: "Stage created successfully", data: stage };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async findAllStages(query: any) {
        try {
            const { tenant_uuid } = query;
            const stages = await this.stageModel
                .find({ tenant_uuid, status: "0" })
                .sort({ sort_order: 1 })
                .lean();

            // Attach leads count per stage
            const result = await Promise.all(
                stages.map(async (stage) => {
                    const leadsCount = await this.leadModel.countDocuments({
                        stage_uuid: stage.stage_uuid,
                        status: "active",
                    });
                    const leads = await this.leadModel
                        .find({ stage_uuid: stage.stage_uuid, status: "active" })
                        .sort({ _id: -1 })
                        .lean();

                    const enrichedLeads = await Promise.all(
                        leads.map(async (lead: any) => {
                            if (!lead.campaign_name && (lead.phone || lead.email)) {
                                const phoneStr = String(lead.phone || "").trim();
                                const digitsOnly = phoneStr.replace(/\D/g, "");
                                const conditions: any[] = [];
                                if (phoneStr) {
                                    conditions.push({ phone_number: phoneStr });
                                    conditions.push({ custom_phone_number: phoneStr });
                                }
                                if (digitsOnly && digitsOnly.length >= 7) {
                                    const last10 = digitsOnly.slice(-10);
                                    conditions.push({ phone_number: { $regex: last10 } });
                                    conditions.push({ custom_phone_number: { $regex: last10 } });
                                }
                                if (lead.email) {
                                    conditions.push({ email: lead.email });
                                }

                                const lm = await this.leadManagementModel.findOne({
                                    tenant_uuid,
                                    $or: conditions,
                                }).lean();
                                if (lm) {
                                    const camp = await this.resolveCampaign(
                                        lm.campaign_uuid ? String(lm.campaign_uuid) : "",
                                        lm.lead_group_uuid ? String(lm.lead_group_uuid) : ""
                                    );
                                    if (camp.campaign_name) {
                                        this.leadModel.updateOne(
                                            { lead_uuid: lead.lead_uuid },
                                            { $set: { campaign_name: camp.campaign_name, campaign_uuid: camp.campaign_uuid } }
                                        ).exec();
                                        return { ...lead, ...camp };
                                    }
                                }
                            }
                            return lead;
                        })
                    );

                    return { ...stage, leadsCount, leads: enrichedLeads };
                })
            );

            this.logger.log(`${getMethod} - Stages fetched for tenant: ${tenant_uuid}`);
            return { statusCode: HttpStatus.OK, data: result, count: result.length };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async updateStage(uuid: string, dto: Partial<CreatePipelineStageDto>) {
        try {
            const updated = await this.stageModel.findOneAndUpdate(
                { stage_uuid: uuid },
                { $set: dto },
                { new: true }
            );
            if (!updated) return { statusCode: HttpStatus.NOT_FOUND, message: "Stage not found" };
            this.logger.log(`${putMethod} - Stage updated: ${uuid}`);
            return { statusCode: HttpStatus.OK, message: "Stage updated successfully", data: updated };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async deleteStage(uuid: string) {
        try {
            // Move leads to uncategorized / just mark them inactive
            await this.leadModel.updateMany({ stage_uuid: uuid }, { $set: { status: "inactive" } });
            const deleted = await this.stageModel.findOneAndDelete({ stage_uuid: uuid });
            if (!deleted) return { statusCode: HttpStatus.NOT_FOUND, message: "Stage not found" };
            this.logger.log(`${deleteMethod} - Stage deleted: ${uuid}`);
            return { statusCode: HttpStatus.OK, message: "Stage deleted successfully" };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    /* ═══════════════════════════════════════
       LEAD METHODS
    ═══════════════════════════════════════ */

    async createLead(dto: CreatePipelineLeadDto) {
        try {
            const stage = await this.stageModel.findOne({ stage_uuid: dto.stage_uuid });
            if (!stage) return { statusCode: HttpStatus.NOT_FOUND, message: "Stage not found" };

            if (!dto.tags || dto.tags.length === 0) {
                dto.tags = [stage.name];
            }

            const lead = await this.leadModel.create(dto);

            // Auto-assign user via round-robin (always overrides any manually set user)
            await this.assignLeadRoundRobin(lead.lead_uuid, String(lead.tenant_uuid || ""));

            this.logger.log(`${postMethod} - Lead created: ${lead.lead_uuid}`);

            return { statusCode: HttpStatus.CREATED, message: "Lead created successfully", data: lead };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async findLeadsByStage(stageUuid: string, query: any) {
        try {
            const { page = 1, limit = 50, search } = query;
            const skip = (Number(page) - 1) * Number(limit);
            let filter: any = { stage_uuid: stageUuid, status: "active" };
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
            }
            const [data, count] = await Promise.all([
                this.leadModel.find(filter).sort({ _id: -1 }).skip(skip).limit(Number(limit)).lean(),
                this.leadModel.countDocuments(filter),
            ]);
            this.logger.log(`${getMethod} - Leads fetched for stage: ${stageUuid}`);
            return { statusCode: HttpStatus.OK, data, count };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async updateLead(uuid: string, dto: Partial<CreatePipelineLeadDto>) {
        try {
            let stage: any = null;
            if (dto.stage_uuid) {
                stage = await this.stageModel.findOne({ stage_uuid: dto.stage_uuid });
                if (stage && (!dto.tags || dto.tags.length === 0)) {
                    dto.tags = [stage.name];
                }
            }
            if (dto.campaign_uuid && !dto.campaign_name) {
                const camp = await this.resolveCampaign(dto.campaign_uuid);
                if (camp?.campaign_name) dto.campaign_name = camp.campaign_name;
            }
            if (dto.lead_group_uuid && !dto.lead_group_name) {
                const lg = await this.leadGroupModel.findOne({
                    $or: [{ uuid: dto.lead_group_uuid }, { lead_group_uuid: dto.lead_group_uuid }]
                }).lean();
                if (lg?.name) dto.lead_group_name = String(lg.name);
            }
            if (dto.user_uuid && !dto.user_name) {
                const u = await this.userModel.findOne({
                    $or: [{ uuid: dto.user_uuid }, { user_uuid: dto.user_uuid }]
                }).lean();
                if (u) {
                    dto.user_name = String(u.fullname || u.username || dto.user_uuid);
                }
            }
            const updated = await this.leadModel.findOneAndUpdate(
                { lead_uuid: uuid },
                { $set: dto },
                { new: true }
            );
            if (!updated) return { statusCode: HttpStatus.NOT_FOUND, message: "Lead not found" };

            this.logger.log(`${putMethod} - Lead updated: ${uuid}`);
            return { statusCode: HttpStatus.OK, message: "Lead updated successfully", data: updated };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async moveLead(uuid: string, stageUuid: string) {
        try {
            const stage = await this.stageModel.findOne({ stage_uuid: stageUuid });
            if (!stage) return { statusCode: HttpStatus.NOT_FOUND, message: "Target stage not found" };
            const updated = await this.leadModel.findOneAndUpdate(
                { lead_uuid: uuid },
                { $set: { stage_uuid: stageUuid, tags: [stage.name] } },
                { new: true }
            );
            if (!updated) return { statusCode: HttpStatus.NOT_FOUND, message: "Lead not found" };

            this.logger.log(`${putMethod} - Lead moved: ${uuid} to stage: ${stage.name}`);
            return { statusCode: HttpStatus.OK, message: "Lead moved successfully", data: updated };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async deleteLead(uuid: string) {
        try {
            const deleted = await this.leadModel.findOneAndUpdate(
                { lead_uuid: uuid },
                { $set: { status: "inactive" } },
                { new: true }
            );
            if (!deleted) return { statusCode: HttpStatus.NOT_FOUND, message: "Lead not found" };
            this.logger.log(`${deleteMethod} - Lead deleted: ${uuid}`);
            return { statusCode: HttpStatus.OK, message: "Lead deleted successfully" };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async bulkDeleteLeads(leadUuids: string[]) {
        try {
            if (!leadUuids || !Array.isArray(leadUuids) || leadUuids.length === 0) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "lead_uuids array is required" };
            }
            const res = await this.leadModel.updateMany(
                { lead_uuid: { $in: leadUuids } },
                { $set: { status: "inactive" } }
            );
            this.logger.log(`${deleteMethod} - Bulk deleted ${res.modifiedCount} leads out of ${leadUuids.length} requested`);
            return {
                statusCode: HttpStatus.OK,
                message: `Successfully deleted ${res.modifiedCount} lead(s)`,
                count: res.modifiedCount,
            };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async bulkUpdateLeads(dto: BulkUpdatePipelineLeadsDto) {
        try {
            if (!dto.lead_uuids || !Array.isArray(dto.lead_uuids) || dto.lead_uuids.length === 0) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "lead_uuids array is required" };
            }

            const updateFields: any = {};

            // 1. Lead Group
            if (dto.lead_group_uuid !== undefined) {
                updateFields.lead_group_uuid = dto.lead_group_uuid || "";
                if (dto.lead_group_name) {
                    updateFields.lead_group_name = dto.lead_group_name;
                } else if (dto.lead_group_uuid) {
                    const lg = await this.leadGroupModel.findOne({
                        $or: [{ uuid: dto.lead_group_uuid }, { lead_group_uuid: dto.lead_group_uuid }]
                    }).lean();
                    updateFields.lead_group_name = lg?.name ? String(lg.name) : "";
                } else {
                    updateFields.lead_group_name = "";
                }
            }

            // 2. Campaign
            if (dto.campaign_uuid !== undefined) {
                updateFields.campaign_uuid = dto.campaign_uuid || "";
                if (dto.campaign_name) {
                    updateFields.campaign_name = dto.campaign_name;
                } else if (dto.campaign_uuid) {
                    const camp = await this.resolveCampaign(dto.campaign_uuid);
                    updateFields.campaign_name = camp?.campaign_name || "";
                } else {
                    updateFields.campaign_name = "";
                }
            } else if (dto.lead_group_uuid && updateFields.campaign_uuid === undefined) {
                // If campaign was not explicitly given, try resolving linked campaign from lead group
                const camp = await this.resolveCampaign(undefined, dto.lead_group_uuid);
                if (camp?.campaign_uuid) {
                    updateFields.campaign_uuid = camp.campaign_uuid;
                    updateFields.campaign_name = camp.campaign_name;
                }
            }

            // 3. User / Agent
            if (dto.user_uuid !== undefined) {
                updateFields.user_uuid = dto.user_uuid || "";
                if (dto.user_name) {
                    updateFields.user_name = dto.user_name;
                } else if (dto.user_uuid) {
                    const u = await this.userModel.findOne({
                        $or: [{ uuid: dto.user_uuid }, { user_uuid: dto.user_uuid }]
                    }).lean();
                    if (u) {
                        updateFields.user_name = String(u.fullname || u.username || dto.user_uuid);
                    } else {
                        updateFields.user_name = "";
                    }
                } else {
                    updateFields.user_name = "";
                }
            }

            // 4. Stage
            if (dto.stage_uuid) {
                const stage = await this.stageModel.findOne({ stage_uuid: dto.stage_uuid });
                if (stage) {
                    updateFields.stage_uuid = dto.stage_uuid;
                    updateFields.tags = [stage.name];
                }
            }

            if (Object.keys(updateFields).length === 0) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "No update fields provided" };
            }

            const res = await this.leadModel.updateMany(
                { lead_uuid: { $in: dto.lead_uuids } },
                { $set: updateFields }
            );

            this.logger.log(`${putMethod} - Bulk updated ${res.modifiedCount} leads out of ${dto.lead_uuids.length} requested`);
            return {
                statusCode: HttpStatus.OK,
                message: `Successfully updated ${res.modifiedCount} lead(s)`,
                count: res.modifiedCount,
            };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }


    /* ═══════════════════════════════════════
       CAMPAIGN RESOLVER
    ═══════════════════════════════════════ */

    async resolveCampaign(campaignUuid?: string, leadGroupUuid?: string): Promise<{ campaign_name: string; campaign_uuid: string }> {
        try {
            if (campaignUuid) {
                const out = await this.outboundCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if (out?.name) return { campaign_name: String(out.name), campaign_uuid: String(out.uuid || campaignUuid) };

                const bl = await this.blendedCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if (bl?.name) return { campaign_name: String(bl.name), campaign_uuid: String(bl.uuid || campaignUuid) };

                const inb = await this.inboundCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if (inb?.name) return { campaign_name: String(inb.name), campaign_uuid: String(inb.uuid || campaignUuid) };
            }

            if (leadGroupUuid) {
                const outByGroup = await this.outboundCampaignModel.findOne({ lead_group_uuid: leadGroupUuid }).lean();
                if (outByGroup?.name) return { campaign_name: String(outByGroup.name), campaign_uuid: String(outByGroup.uuid || "") };

                const blByGroup = await this.blendedCampaignModel.findOne({ lead_group_uuid: leadGroupUuid }).lean();
                if (blByGroup?.name) return { campaign_name: String(blByGroup.name), campaign_uuid: String(blByGroup.uuid || "") };

                const lg = await this.leadGroupModel.findOne({
                    $or: [{ uuid: leadGroupUuid }, { lead_group_uuid: leadGroupUuid }],
                }).lean();
                if (lg?.campaign_uuid) {
                    return this.resolveCampaign(String(lg.campaign_uuid));
                }
            }
        } catch (e) {
            this.logger.error("Failed to resolve campaign: " + e.message);
        }
        return { campaign_name: "", campaign_uuid: "" };
    }

    /* ═══════════════════════════════════════
       SEARCH / BOARD VIEW
    ═══════════════════════════════════════ */

    async getBoardView(query: any) {
        try {
            const {
                tenant_uuid,
                search,
                priority,
                stage_uuid,
                user_uuid,
                lead_group_uuid,
                campaign_uuid,
                date_filter,
                start_date,
                end_date,
            } = query;

            if (!tenant_uuid) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "tenant_uuid is required" };
            }

            const stages = await this.stageModel
                .find({ tenant_uuid, status: "0" })
                .sort({ order: 1, _id: 1 })
                .lean();

            // Build shared filter conditions across all stages
            const andConditions: any[] = [];

            if (search && String(search).trim()) {
                const term = String(search).trim();
                andConditions.push({
                    $or: [
                        { name: { $regex: term, $options: "i" } },
                        { phone: { $regex: term, $options: "i" } },
                        { email: { $regex: term, $options: "i" } },
                        { campaign_name: { $regex: term, $options: "i" } },
                        { lead_group_name: { $regex: term, $options: "i" } },
                        { user_name: { $regex: term, $options: "i" } },
                    ],
                });
            }

            if (priority && String(priority).trim()) {
                const pList = Array.isArray(priority)
                    ? priority
                    : String(priority).split(",").map((p: any) => String(p).trim()).filter(Boolean);
                if (pList.length > 0) {
                    andConditions.push({
                        priority: { $in: pList.map((p: string) => new RegExp(`^${p}$`, "i")) },
                    });
                }
            }

            // Quick date filter (Today / Yesterday) or custom date range
            if (date_filter && String(date_filter).trim()) {
                const df = String(date_filter).trim().toLowerCase();
                const now = new Date();
                if (df === "today") {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    andConditions.push({ createdAt: { $gte: start, $lte: end } });
                } else if (df === "yesterday") {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                    andConditions.push({ createdAt: { $gte: start, $lte: end } });
                }
            } else if (start_date || end_date) {
                const dateRange: any = {};
                if (start_date) {
                    const start = new Date(start_date);
                    start.setHours(0, 0, 0, 0);
                    dateRange.$gte = start;
                }
                if (end_date) {
                    const end = new Date(end_date);
                    end.setHours(23, 59, 59, 999);
                    dateRange.$lte = end;
                }
                andConditions.push({ createdAt: dateRange });
            }

            // Assignee filter (supports single, comma-separated, or array)
            if (user_uuid && String(user_uuid).trim()) {
                const userUuids = Array.isArray(user_uuid)
                    ? user_uuid
                    : String(user_uuid).split(",").map((u: any) => String(u).trim()).filter(Boolean);
                if (userUuids.length > 0) {
                    const userLmUuids = await this.leadManagementModel
                        .find({ tenant_uuid, user_uuid: { $in: userUuids } })
                        .select("lead_management_uuid uuid")
                        .lean();
                    const lmUuidList = userLmUuids.flatMap((m: any) => [m.lead_management_uuid, m.uuid]).filter(Boolean);
                    andConditions.push({
                        $or: [
                            { user_uuid: { $in: userUuids } },
                            ...(lmUuidList.length > 0 ? [{ lead_management_uuid: { $in: lmUuidList } }] : []),
                        ],
                    });
                }
            }

            // Lead Group filter (supports single, comma-separated, or array)
            if (lead_group_uuid && String(lead_group_uuid).trim()) {
                const lgUuids = Array.isArray(lead_group_uuid)
                    ? lead_group_uuid
                    : String(lead_group_uuid).split(",").map((g: any) => String(g).trim()).filter(Boolean);
                if (lgUuids.length > 0) {
                    const lgLmUuids = await this.leadManagementModel
                        .find({ tenant_uuid, lead_group_uuid: { $in: lgUuids } })
                        .select("lead_management_uuid uuid")
                        .lean();
                    const lmUuidList = lgLmUuids.flatMap((m: any) => [m.lead_management_uuid, m.uuid]).filter(Boolean);
                    andConditions.push({
                        $or: [
                            { lead_group_uuid: { $in: lgUuids } },
                            ...(lmUuidList.length > 0 ? [{ lead_management_uuid: { $in: lmUuidList } }] : []),
                        ],
                    });
                }
            }

            // Campaign filter (supports single, comma-separated, or array)
            if (campaign_uuid && String(campaign_uuid).trim()) {
                const campUuids = Array.isArray(campaign_uuid)
                    ? campaign_uuid
                    : String(campaign_uuid).split(",").map((c: any) => String(c).trim()).filter(Boolean);
                if (campUuids.length > 0) {
                    const campLmUuids = await this.leadManagementModel
                        .find({ tenant_uuid, campaign_uuid: { $in: campUuids } })
                        .select("lead_management_uuid uuid")
                        .lean();
                    const lmUuidList = campLmUuids.flatMap((m: any) => [m.lead_management_uuid, m.uuid]).filter(Boolean);
                    andConditions.push({
                        $or: [
                            { campaign_uuid: { $in: campUuids } },
                            ...(lmUuidList.length > 0 ? [{ lead_management_uuid: { $in: lmUuidList } }] : []),
                        ],
                    });
                }
            }

            const selectedStageList = stage_uuid
                ? (Array.isArray(stage_uuid) ? stage_uuid : String(stage_uuid).split(",").map((s: any) => String(s).trim()).filter(Boolean))
                : [];

            const result = await Promise.all(
                stages.map(async (stage) => {
                    let leadFilter: any = { stage_uuid: stage.stage_uuid, status: "active" };
                    if (andConditions.length > 0) {
                        leadFilter.$and = andConditions;
                    }
                    if (selectedStageList.length > 0 && !selectedStageList.includes(stage.stage_uuid)) {
                        return { ...stage, leads: [], leadsCount: 0 };
                    }
                    const leads = await this.leadModel.find(leadFilter).sort({ _id: -1 }).lean();
                    if (!leads || leads.length === 0) {
                        return { ...stage, leads: [], leadsCount: 0 };
                    }

                    // Collect lead_management_uuids and phones
                    const lmUuids = leads.map((l: any) => l.lead_management_uuid).filter((u: any) => Boolean(u));
                    const phones = leads.map((l: any) => String(l.phone || "").trim()).filter((p: any) => Boolean(p));

                    const conditions: any[] = [];
                    if (lmUuids.length > 0) {
                        conditions.push({ lead_management_uuid: { $in: lmUuids } });
                        conditions.push({ uuid: { $in: lmUuids } });
                    }
                    if (phones.length > 0) {
                        conditions.push({ phone_number: { $in: phones } });
                        conditions.push({ custom_phone_number: { $in: phones } });
                    }

                    let lmRecords: any[] = [];
                    if (conditions.length > 0) {
                        lmRecords = await this.leadManagementModel.find({
                            tenant_uuid,
                            $or: conditions,
                        }).lean();
                    }

                    const lmByUuid = new Map<string, any>();
                    const lmByPhone = new Map<string, any>();
                    lmRecords.forEach((rec: any) => {
                        if (rec.lead_management_uuid) lmByUuid.set(String(rec.lead_management_uuid), rec);
                        if (rec.uuid) lmByUuid.set(String(rec.uuid), rec);
                        if (rec.phone_number) lmByPhone.set(String(rec.phone_number).trim(), rec);
                        if (rec.custom_phone_number) lmByPhone.set(String(rec.custom_phone_number).trim(), rec);
                    });

                    // Collect lead group uuids
                    const allLgUuids = new Set<string>();
                    leads.forEach((l: any) => {
                        const lm = (l.lead_management_uuid && lmByUuid.get(String(l.lead_management_uuid))) ||
                                   (l.phone && lmByPhone.get(String(l.phone).trim()));
                        const lgUuid = lm?.lead_group_uuid || l.lead_group_uuid;
                        if (lgUuid) allLgUuids.add(String(lgUuid));
                    });

                    const lgList = allLgUuids.size > 0
                        ? await this.leadGroupModel.find({
                            $or: [
                                { uuid: { $in: Array.from(allLgUuids) } },
                                { lead_group_uuid: { $in: Array.from(allLgUuids) } },
                            ]
                        }).select("uuid lead_group_uuid name campaign_uuid").lean()
                        : [];

                    const lgMap = new Map<string, any>();
                    lgList.forEach((g: any) => {
                        if (g.uuid) lgMap.set(String(g.uuid), g);
                        if (g.lead_group_uuid) lgMap.set(String(g.lead_group_uuid), g);
                    });

                    // Collect user uuids
                    const allUserUuids = new Set<string>();
                    leads.forEach((l: any) => {
                        const lm = (l.lead_management_uuid && lmByUuid.get(String(l.lead_management_uuid))) ||
                                   (l.phone && lmByPhone.get(String(l.phone).trim()));
                        const uUuid = lm?.user_uuid || l.user_uuid;
                        if (uUuid) allUserUuids.add(String(uUuid));
                    });

                    const uList = allUserUuids.size > 0
                        ? await this.userModel.find({
                            $or: [
                                { uuid: { $in: Array.from(allUserUuids) } },
                                { user_uuid: { $in: Array.from(allUserUuids) } },
                            ]
                        }).select("uuid user_uuid fullname username").lean()
                        : [];

                    const userMap = new Map<string, string>();
                    uList.forEach((u: any) => {
                        const uName = String(u.fullname || u.username || "");
                        if (u.uuid) userMap.set(String(u.uuid), uName);
                        if (u.user_uuid) userMap.set(String(u.user_uuid), uName);
                    });

                    const enrichedLeads = await Promise.all(
                        leads.map(async (lead: any) => {
                            const lm = (lead.lead_management_uuid && lmByUuid.get(String(lead.lead_management_uuid))) ||
                                       (lead.phone && lmByPhone.get(String(lead.phone).trim())) || null;

                            const leadGroupUuid = lead.lead_group_uuid || lm?.lead_group_uuid || "";
                            const lgObj = leadGroupUuid ? lgMap.get(String(leadGroupUuid)) : null;
                            const leadGroupName = lead.lead_group_name || lgObj?.name || "";

                            const userUuid = lead.user_uuid || lm?.user_uuid || "";
                            const userName = lead.user_name || (userUuid ? userMap.get(String(userUuid)) : "") || "";

                            const campaignUuid = lead.campaign_uuid || lm?.campaign_uuid || lgObj?.campaign_uuid || "";
                            let campaignName = lead.campaign_name || "";
                            let finalCampUuid = campaignUuid;
                            if (!campaignName && (campaignUuid || leadGroupUuid)) {
                                const camp = await this.resolveCampaign(campaignUuid, leadGroupUuid);
                                campaignName = camp.campaign_name;
                                finalCampUuid = camp.campaign_uuid || campaignUuid;
                            }
                            const leadMgmtUuid = lm?.lead_management_uuid || lm?.uuid || lead.lead_management_uuid || "";

                            // Background persist resolved fields on pipeline_lead if changed or missing
                            if (
                                (leadGroupName && leadGroupName !== lead.lead_group_name) ||
                                (leadGroupUuid && leadGroupUuid !== lead.lead_group_uuid) ||
                                (!lead.user_name && userName) ||
                                (!lead.campaign_name && campaignName) ||
                                (!lead.lead_management_uuid && leadMgmtUuid)
                            ) {
                                this.leadModel.updateOne(
                                    { lead_uuid: lead.lead_uuid },
                                    {
                                        $set: {
                                            lead_group_name: leadGroupName || lead.lead_group_name,
                                            lead_group_uuid: leadGroupUuid || lead.lead_group_uuid,
                                            user_name: userName || lead.user_name,
                                            user_uuid: userUuid || lead.user_uuid,
                                            campaign_name: campaignName || lead.campaign_name,
                                            campaign_uuid: finalCampUuid || lead.campaign_uuid,
                                            lead_management_uuid: leadMgmtUuid || lead.lead_management_uuid,
                                        }
                                    }
                                ).exec();
                            }

                            return {
                                ...lead,
                                lead_group_name: leadGroupName || lead.lead_group_name,
                                lead_group_uuid: leadGroupUuid || lead.lead_group_uuid,
                                user_name: userName || lead.user_name,
                                user_uuid: userUuid || lead.user_uuid,
                                campaign_name: campaignName || lead.campaign_name,
                                campaign_uuid: finalCampUuid || lead.campaign_uuid,
                                lead_management_uuid: leadMgmtUuid,
                                lead_details: lm || null,
                            };
                        })
                    );

                    return { ...stage, leads: enrichedLeads, leadsCount: enrichedLeads.length };
                })
            );
            return { statusCode: HttpStatus.OK, data: result, count: result.length };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    /* ═══════════════════════════════════════
       IMPORT LEADS FROM DISPOSITIONS & LEAD GROUP
    ═══════════════════════════════════════ */

    async importLeads(dto: ImportPipelineLeadsDto) {
        try {
            const { tenant_uuid, lead_group_uuid, disposition_uuids } = dto;
            if (!disposition_uuids || disposition_uuids.length === 0) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "No dispositions selected for import" };
            }

            const STAGE_PALETTE = [
                "#342df2", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
                "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"
            ];

            let totalImported = 0;
            let stagesCreated = 0;
            const stagesProcessed: string[] = [];

            for (const dispUuid of disposition_uuids) {
                // Find disposition details
                const disposition = await this.dispositionModel.findOne({
                    disposition_uuid: dispUuid,
                    $or: [
                        { tenant_uuid },
                        { created_flag: "0" }
                    ]
                }).lean();

                if (!disposition) {
                    this.logger.warn(`Disposition not found: ${dispUuid}`);
                    continue;
                }

                const dispName = String(disposition.name || "").trim();
                if (!dispName) continue;

                // Check or create stage for this tenant
                let stage = await this.stageModel.findOne({
                    tenant_uuid,
                    name: { $regex: new RegExp(`^${dispName}$`, "i") },
                    status: "0",
                });

                if (!stage) {
                    const maxOrderDoc = await this.stageModel
                        .findOne({ tenant_uuid })
                        .sort({ sort_order: -1 })
                        .lean();
                    const nextOrder = maxOrderDoc ? (Number(maxOrderDoc.sort_order) || 0) + 1 : 0;
                    const stageColor = STAGE_PALETTE[nextOrder % STAGE_PALETTE.length];

                    stage = await this.stageModel.create({
                        name: dispName,
                        color: stageColor,
                        tenant_uuid,
                        sort_order: nextOrder,
                        status: "0",
                    });
                    stagesCreated++;
                }

                stagesProcessed.push(dispName);

                // Find matching leads in lead_management (optionally filtered by lead_group_uuid)
                const leadFilter: any = {
                    tenant_uuid,
                    $or: [
                        { lead_status: dispUuid },
                        { lead_status: dispName },
                        { lead_status: disposition.code },
                        { lead_status_1: dispUuid },
                        { lead_status_2: dispUuid },
                    ],
                };
                if (lead_group_uuid && String(lead_group_uuid).trim()) {
                    leadFilter.lead_group_uuid = String(lead_group_uuid).trim();
                }

                const leads = await this.leadManagementModel.find(leadFilter).lean();

                for (const lead of leads) {
                    const phone = String(lead.phone_number || "").trim();
                    if (!phone) continue;

                    const leadMgmtUuid = lead.lead_management_uuid ? String(lead.lead_management_uuid) : "";
                    const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || phone;

                    // Avoid duplicate import of the same lead in this stage:
                    // Check by lead_management_uuid if available, or by phone + name combination
                    const duplicateChecks: any[] = [];
                    if (leadMgmtUuid) {
                        duplicateChecks.push({ lead_management_uuid: leadMgmtUuid });
                    }
                    duplicateChecks.push({ phone, name });

                    const existingLead = await this.leadModel.findOne({
                        tenant_uuid,
                        stage_uuid: stage.stage_uuid,
                        status: "active",
                        $or: duplicateChecks,
                    });

                    if (!existingLead) {
                        const leadCampUuid = lead.campaign_uuid ? String(lead.campaign_uuid) : "";
                        const leadGrpUuid = lead.lead_group_uuid ? String(lead.lead_group_uuid) : (lead_group_uuid ? String(lead_group_uuid) : "");
                        const { campaign_name, campaign_uuid } = await this.resolveCampaign(leadCampUuid, leadGrpUuid);

                        let leadGroupName = "";
                        if (leadGrpUuid) {
                            const lg = await this.leadGroupModel.findOne({ uuid: leadGrpUuid }).lean();
                            leadGroupName = String(lg?.name || "");
                        }

                        let userName = "";
                        if (lead.user_uuid) {
                            const u = await this.userModel.findOne({ uuid: lead.user_uuid }).lean();
                            userName = String(u?.fullname || u?.username || "");
                        }

                        const newLead = await this.leadModel.create({
                            stage_uuid: stage.stage_uuid,
                            tenant_uuid,
                            phone,
                            name,
                            email: lead.email ? String(lead.email) : "",
                            priority: "Medium",
                            value: "0",
                            tags: [dispName],
                            campaign_name: campaign_name || "",
                            campaign_uuid: campaign_uuid || "",
                            lead_group_name: leadGroupName,
                            lead_group_uuid: leadGrpUuid,
                            user_name: userName,
                            user_uuid: lead.user_uuid ? String(lead.user_uuid) : "",
                            lead_management_uuid: leadMgmtUuid || "",
                            status: "active",
                        });
                        // Auto-assign user via round-robin (always overrides any imported user_uuid)
                        await this.assignLeadRoundRobin(newLead.lead_uuid, tenant_uuid);
                        totalImported++;
                    }
                }
            }

            this.logger.log(`${postMethod} - Imported ${totalImported} leads across ${stagesProcessed.length} stages (${stagesCreated} created) for tenant: ${tenant_uuid}`);
            return {
                statusCode: HttpStatus.OK,
                message: `Successfully imported ${totalImported} leads across ${stagesProcessed.length} stage(s).`,
                data: {
                    totalImported,
                    stagesCreated,
                    stagesProcessed,
                },
            };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    /* ═══════════════════════════════════════
       ASSIGNMENT CONFIG METHODS
    ═══════════════════════════════════════ */

    async getAssignmentConfig(tenant_uuid: string) {
        try {
            if (!tenant_uuid) return { statusCode: HttpStatus.BAD_REQUEST, message: "tenant_uuid is required" };
            const config = await this.assignmentConfigModel.findOne({ tenant_uuid }).lean();
            return { statusCode: HttpStatus.OK, data: config || null };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    async upsertAssignmentConfig(dto: UpsertAssignmentConfigDto) {
        try {
            const { tenant_uuid, enabled, users, auto_import, auto_import_dispositions } = dto;
            if (!tenant_uuid) return { statusCode: HttpStatus.BAD_REQUEST, message: "tenant_uuid is required" };

            const updateFields: any = {
                current_user_index: 0,
                current_user_count: 0,
            };

            if (enabled !== undefined) {
                updateFields.enabled = !!enabled;
            }

            if (users !== undefined) {
                updateFields.users = (users || []).map((u) => ({
                    user_uuid: String(u.user_uuid || ""),
                    user_name: String(u.user_name || ""),
                    frequency: Math.max(1, Math.min(100, Number(u.frequency) || 1)),
                })).filter(u => !!u.user_uuid);
            }

            if (auto_import !== undefined) {
                updateFields.auto_import = !!auto_import;
            }

            if (auto_import_dispositions !== undefined) {
                updateFields.auto_import_dispositions = (auto_import_dispositions || [])
                    .map(d => String(d || "").trim())
                    .filter(d => !!d);
            }

            const config = await this.assignmentConfigModel.findOneAndUpdate(
                { tenant_uuid },
                {
                    $set: updateFields,
                    $setOnInsert: { tenant_uuid },
                },
                { upsert: true, new: true }
            );

            this.logger.log(`${putMethod} - Assignment config saved for tenant: ${tenant_uuid}`);
            return { statusCode: HttpStatus.OK, message: "Assignment config saved successfully", data: config };
        } catch (e) {
            this.logger.error(e);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }


    /**
     * Distribute existing active leads in Kanban for this tenant according to round-robin config.
     * This ONLY updates Kanban leads (pipeline_leads), leaving lead management untouched.
     */
    async distributeExistingLeads(tenant_uuid: string) {
        try {
            if (!tenant_uuid) {
                return { statusCode: HttpStatus.BAD_REQUEST, message: "tenant_uuid is required" };
            }

            const config = await this.assignmentConfigModel.findOne({ tenant_uuid });
            if (!config || !config.users || config.users.length === 0) {
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: "No active agents configured for auto-assignment. Please select agents and save config first."
                };
            }

            const users = config.users;

            // Fetch active stage UUIDs for this tenant so we only distribute leads currently visible in Kanban
            const activeStages = await this.stageModel.find({ tenant_uuid, status: "0" }).select("stage_uuid").lean();
            const activeStageUuids = activeStages.map((s: any) => s.stage_uuid);

            if (activeStageUuids.length === 0) {
                return { statusCode: HttpStatus.OK, message: "No active stages found in Kanban board", count: 0 };
            }

            const leads = await this.leadModel.find({
                stage_uuid: { $in: activeStageUuids },
                status: "active"
            }).sort({ createdAt: 1, _id: 1 });

            if (leads.length === 0) {
                return { statusCode: HttpStatus.OK, message: "No active leads found in Kanban board", count: 0 };
            }

            let idx = config.current_user_index ?? 0;
            let count = config.current_user_count ?? 0;
            if (idx >= users.length) idx = 0;

            const distributionLog: any[] = [];
            const bulkOps: any[] = [];

            for (const lead of leads) {
                const assignedUser = users[idx];

                count += 1;
                let nextIdx = idx;
                let nextCount = count;
                if (count >= (assignedUser.frequency || 1)) {
                    nextCount = 0;
                    nextIdx = (idx + 1) % users.length;
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: lead._id },
                        update: { $set: { user_uuid: assignedUser.user_uuid, user_name: assignedUser.user_name } }
                    }
                });

                distributionLog.push({
                    lead_name: lead.name,
                    assigned_to: assignedUser.user_name,
                });

                idx = nextIdx;
                count = nextCount;
            }

            if (bulkOps.length > 0) {
                await this.leadModel.bulkWrite(bulkOps);
            }

            // Persist pointer so any subsequent new lead created or imported continues smoothly
            await this.assignmentConfigModel.updateOne(
                { tenant_uuid },
                { $set: { current_user_index: idx, current_user_count: count } }
            );

            this.logger.log(`[AutoAssign] Distributed ${leads.length} existing leads for tenant ${tenant_uuid}`);

            return {
                statusCode: HttpStatus.OK,
                message: `Successfully distributed ${leads.length} leads across ${users.length} active agent(s)`,
                count: leads.length,
                details: distributionLog,
            };
        } catch (e) {
            this.logger.error("[AutoAssign] Failed to distribute existing leads: " + e.message);
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: e.message };
        }
    }

    /**
     * Round-robin engine.
     * Atomically picks the next user from config and assigns them to the given lead.
     * Safe for concurrent imports — uses findOneAndUpdate to advance the pointer atomically.
     */
    private async assignLeadRoundRobin(leadUuid: string, tenant_uuid: string): Promise<void> {
        try {
            if (!tenant_uuid || !leadUuid) return;

            const config = await this.assignmentConfigModel.findOne({ tenant_uuid });
            if (!config || !config.enabled || !config.users || config.users.length === 0) return;

            const users = config.users;
            let idx   = config.current_user_index ?? 0;
            let count = config.current_user_count  ?? 0;

            // Guard against out-of-bounds index (e.g. users list shrank)
            if (idx >= users.length) idx = 0;

            const assignedUser = users[idx];

            // Advance counter atomically — increment count, rotate if needed
            count += 1;
            let nextIdx   = idx;
            let nextCount = count;
            if (count >= assignedUser.frequency) {
                nextCount = 0;
                nextIdx   = (idx + 1) % users.length;
            }

            // Persist new pointer
            await this.assignmentConfigModel.updateOne(
                { tenant_uuid },
                { $set: { current_user_index: nextIdx, current_user_count: nextCount } }
            );

            // Assign user to lead
            await this.leadModel.updateOne(
                { lead_uuid: leadUuid },
                { $set: { user_uuid: assignedUser.user_uuid, user_name: assignedUser.user_name } }
            );

            this.logger.log(`[AutoAssign] lead ${leadUuid} → ${assignedUser.user_name} (${assignedUser.user_uuid}) [slot ${idx}, count ${count}/${assignedUser.frequency}]`);
        } catch (err) {
            // Non-fatal: log and continue so lead creation is not blocked
            this.logger.error("[AutoAssign] Failed to assign lead: " + err.message);
        }
    }
}
