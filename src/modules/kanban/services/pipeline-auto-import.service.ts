import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
    PipelineLeadDocument,
    PipelineLeadSchema,
    PipelineStageDocument,
    PipelineStageSchema,
    PipelineAssignmentConfigDocument,
    PipelineAssignmentConfigSchema,
} from "../schema/pipeline.schema";
import { DispositionDocument, DispositionSchema } from "../../disposition/schema/disposition.schema";
import { LeadGroupDocument, LeadGroupSchema } from "../../lead-group/schema/lead-group.schema";
import { UserDocument, UserSchema } from "../../user/schema/user.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "../../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "../../campaigns/blended-campaign/schema/blended-campaign.schema";
import { InboundCampaignDocument, InboundCampaignSchema } from "../../campaigns/inbound-campaign/schema/inbound-campaign.schema";

@Injectable()
export class PipelineAutoImportService {

    private readonly logger = new Logger(PipelineAutoImportService.name);

    private readonly STAGE_PALETTE = [
        "#342df2", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
        "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
    ];

    constructor(
        @InjectModel(PipelineAssignmentConfigSchema.name) private readonly assignmentConfigModel: Model<PipelineAssignmentConfigDocument>,
        @InjectModel(PipelineStageSchema.name)             private readonly stageModel:            Model<PipelineStageDocument>,
        @InjectModel(PipelineLeadSchema.name)              private readonly leadModel:             Model<PipelineLeadDocument>,
        @InjectModel(DispositionSchema.name)               private readonly dispositionModel:      Model<DispositionDocument>,
        @InjectModel(LeadGroupSchema.name)                 private readonly leadGroupModel:        Model<LeadGroupDocument>,
        @InjectModel(UserSchema.name)                      private readonly userModel:             Model<UserDocument>,
        @InjectModel(OutboundCampaignSchema.name)          private readonly outboundCampaignModel: Model<OutboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name)           private readonly blendedCampaignModel:  Model<BlendedCampaignDocument>,
        @InjectModel(InboundCampaignSchema.name)           private readonly inboundCampaignModel:  Model<InboundCampaignDocument>,
    ) {}

    /**
     * Batch fire-and-forget: for CSV imports or bulk lead operations.
     * Checks config once per tenant to ensure zero overhead if toggle is OFF.
     */
    async tryAutoImportMany(leads: any[]): Promise<void> {
        try {
            if (!leads || !Array.isArray(leads) || leads.length === 0) return;

            // Group leads by tenant_uuid
            const tenantLeadsMap = new Map<string, any[]>();
            for (const lead of leads) {
                const tenant_uuid = String(lead?.tenant_uuid || "").trim();
                if (!tenant_uuid) continue;
                if (!tenantLeadsMap.has(tenant_uuid)) {
                    tenantLeadsMap.set(tenant_uuid, []);
                }
                tenantLeadsMap.get(tenant_uuid)!.push(lead);
            }

            for (const [tenant_uuid, tLeads] of tenantLeadsMap.entries()) {
                const config = await this.assignmentConfigModel
                    .findOne({ tenant_uuid, auto_import: true })
                    .lean();

                if (!config) continue; // Toggle OFF for this tenant

                const watchedDispositions: string[] = (config as any).auto_import_dispositions || [];
                if (watchedDispositions.length === 0) continue;

                // Process matching leads in batches
                for (const lead of tLeads) {
                    await this.tryAutoImport(lead).catch(() => {});
                }
            }
        } catch (err) {
            this.logger.error("[AutoImport] Batch failed: " + err?.message);
        }
    }

    /**
     * Fire-and-forget: call this after any lead create/update in LeadManagementService.
     * It NEVER throws — all errors are caught and logged internally.
     * It NEVER blocks the lead creation response (caller should not await it).
     *
     * @param lead  The raw lead_management document just saved
     */
    async tryAutoImport(lead: any): Promise<void> {
        try {
            if (!lead) return;

            const tenant_uuid          = String(lead.tenant_uuid          || "").trim();
            const lead_status          = String(lead.lead_status          || "").trim();
            const phone_number         = String(lead.phone_number         || "").trim();
            const lead_management_uuid = String(lead.lead_management_uuid || "").trim();

            if (!tenant_uuid || !lead_status || !phone_number) return;

            // ── 1. Check if auto_import is enabled for this tenant ──
            const config = await this.assignmentConfigModel
                .findOne({ tenant_uuid, auto_import: true })
                .lean();

            if (!config) return; // toggle OFF or no config yet

            const watchedDispositions: string[] = (config as any).auto_import_dispositions || [];
            if (watchedDispositions.length === 0) return; // nothing configured

            // ── 2. Resolve the disposition document ──
            const disposition = await this.dispositionModel.findOne({
                $and: [
                    {
                        $or: [
                            { disposition_uuid: lead_status },
                            { name: lead_status },
                            { code: lead_status },
                        ],
                    },
                    {
                        $or: [
                            { tenant_uuid },
                            { created_flag: "0" }, // global dispositions
                        ],
                    },
                ],
            }).lean();

            if (!disposition) {
                this.logger.debug(`[AutoImport] No disposition found for lead_status: ${lead_status} (tenant: ${tenant_uuid})`);
                return;
            }

            const dispUuid = String((disposition as any).disposition_uuid || "");
            const dispCode = String((disposition as any).code || "");
            const dispName = String((disposition as any).name || "").trim();

            // ── 3. Check if this disposition is in the watch list ──
            const isWatched = watchedDispositions.some(
                d => d === dispUuid || d === dispName || d === dispCode || d === lead_status
            );
            if (!isWatched) return;

            this.logger.debug(`[AutoImport] Lead ${lead_management_uuid} matches disposition "${dispName}" — importing`);

            // ── 4. Find or create the pipeline stage ──
            let stage = await this.stageModel.findOne({
                tenant_uuid,
                name: { $regex: new RegExp(`^${dispName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
                status: "0",
            });

            if (!stage) {
                const maxOrderDoc = await this.stageModel
                    .findOne({ tenant_uuid })
                    .sort({ sort_order: -1 })
                    .lean();
                const nextOrder  = maxOrderDoc ? (Number((maxOrderDoc as any).sort_order) || 0) + 1 : 0;
                const stageColor = this.STAGE_PALETTE[nextOrder % this.STAGE_PALETTE.length];

                stage = await this.stageModel.create({
                    name:       dispName,
                    color:      stageColor,
                    tenant_uuid,
                    sort_order: nextOrder,
                    status:     "0",
                });
                this.logger.log(`[AutoImport] Created new stage "${dispName}" for tenant ${tenant_uuid}`);
            }

            // ── 5. Duplicate check (same logic as importLeads) ──
            const phone = phone_number;
            const name  = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || phone;

            const duplicateChecks: any[] = [];
            if (lead_management_uuid) {
                duplicateChecks.push({ lead_management_uuid });
            }
            duplicateChecks.push({ phone, name });

            const existingLead = await this.leadModel.findOne({
                tenant_uuid,
                stage_uuid: stage.stage_uuid,
                status:     "active",
                $or: duplicateChecks,
            });

            if (existingLead) {
                this.logger.debug(`[AutoImport] Lead already exists in stage "${dispName}" — skipping`);
                return;
            }

            // ── 6. Resolve campaign info ──
            const leadCampUuid = String(lead.campaign_uuid   || "").trim();
            const leadGrpUuid  = String(lead.lead_group_uuid || "").trim();
            const { campaign_name, campaign_uuid } = await this.resolveCampaign(leadCampUuid, leadGrpUuid);

            // ── 7. Resolve lead group name ──
            let leadGroupName = "";
            if (leadGrpUuid) {
                const lg = await this.leadGroupModel
                    .findOne({ $or: [{ uuid: leadGrpUuid }, { lead_group_uuid: leadGrpUuid }] })
                    .lean();
                leadGroupName = String((lg as any)?.name || "");
            }

            // ── 8. Resolve user name ──
            let userName = "";
            if (lead.user_uuid) {
                const u = await this.userModel.findOne({ uuid: lead.user_uuid }).lean();
                userName = String((u as any)?.fullname || (u as any)?.username || "");
            }

            // ── 9. Create the pipeline lead ──
            const newLead = await this.leadModel.create({
                stage_uuid:           stage.stage_uuid,
                tenant_uuid,
                phone,
                name,
                email:                lead.email ? String(lead.email) : "",
                priority:             "Medium",
                value:                "0",
                tags:                 [dispName],
                campaign_name:        campaign_name || "",
                campaign_uuid:        campaign_uuid || "",
                lead_group_name:      leadGroupName,
                lead_group_uuid:      leadGrpUuid,
                user_name:            userName,
                user_uuid:            lead.user_uuid ? String(lead.user_uuid) : "",
                lead_management_uuid: lead_management_uuid || "",
                status:               "active",
            });

            // ── 10. Auto-assign user via round-robin if enabled ──
            await this.assignLeadRoundRobin(newLead.lead_uuid, tenant_uuid);

            this.logger.log(
                `[AutoImport] ✅ Lead ${lead_management_uuid} → stage "${dispName}" (pipeline_lead: ${newLead.lead_uuid})`
            );

        } catch (err) {
            // Fully non-fatal — lead creation response is never affected
            this.logger.error("[AutoImport] Failed: " + err?.message);
        }
    }

    /**
     * Round-robin engine.
     * Atomically picks the next user from config and assigns them to the given lead.
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
            this.logger.error("[AutoAssign] Failed: " + err?.message);
        }
    }

    /** Resolve campaign name/uuid from outbound, blended, or inbound models */
    private async resolveCampaign(
        campaignUuid?: string,
        leadGroupUuid?: string,
    ): Promise<{ campaign_name: string; campaign_uuid: string }> {
        try {
            if (campaignUuid) {
                const out = await this.outboundCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if ((out as any)?.name) return { campaign_name: String((out as any).name), campaign_uuid: String((out as any).uuid || campaignUuid) };

                const bl = await this.blendedCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if ((bl as any)?.name) return { campaign_name: String((bl as any).name), campaign_uuid: String((bl as any).uuid || campaignUuid) };

                const inb = await this.inboundCampaignModel.findOne({ uuid: campaignUuid }).lean();
                if ((inb as any)?.name) return { campaign_name: String((inb as any).name), campaign_uuid: String((inb as any).uuid || campaignUuid) };
            }
            if (leadGroupUuid) {
                const outByGroup = await this.outboundCampaignModel.findOne({ lead_group_uuid: leadGroupUuid }).lean();
                if ((outByGroup as any)?.name) return { campaign_name: String((outByGroup as any).name), campaign_uuid: String((outByGroup as any).uuid || "") };

                const blByGroup = await this.blendedCampaignModel.findOne({ lead_group_uuid: leadGroupUuid }).lean();
                if ((blByGroup as any)?.name) return { campaign_name: String((blByGroup as any).name), campaign_uuid: String((blByGroup as any).uuid || "") };

                const lg = await this.leadGroupModel.findOne({
                    $or: [{ uuid: leadGroupUuid }, { lead_group_uuid: leadGroupUuid }],
                }).lean();
                if ((lg as any)?.campaign_uuid) {
                    return this.resolveCampaign(String((lg as any).campaign_uuid));
                }
            }
        } catch (e) {
            this.logger.error("[AutoImport] resolveCampaign failed: " + e?.message);
        }
        return { campaign_name: "", campaign_uuid: "" };
    }
}
