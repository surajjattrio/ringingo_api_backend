import { Injectable } from '@nestjs/common';
import { randomUUID, createDecipheriv } from "crypto";
import { JWT } from 'google-auth-library';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { CommonDBFunctions } from 'src/modules/common/common_db_functions';
import { GoogleSheetLead, GoogleSheetLeadDocument, GoogleSheetLeadSchema } from 'src/modules/google-sheet/schema/google-sheet-leads.schema';
import { GoogleSheet, GoogleSheetDocument } from 'src/modules/google-sheet/schema/google-sheet.schema';
import { LeadManagementDocument, LeadManagementSchema } from 'src/modules/lead-management/schema/lead-management.schema';
import { LeadManagementService } from 'src/modules/lead-management/services/lead-management.service';
import { LeadGroupDocument, LeadGroupSchema } from 'src/modules/lead-group/schema/lead-group.schema';
import { OutboundCampaignDocument, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { BlendedCampaignDocument, BlendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';
import { BlendedCampaignService } from 'src/modules/campaigns/blended-campaign/services/blended-campaign.service';
import { OutboundCampaignService } from 'src/modules/campaigns/outbound-campaign/services/outbound-campaign.service';
import { GoogleCredential, GoogleCredentialDocument } from '../schema/google-credential.schema';
import { GoogleSheetConfig, GoogleSheetConfigDocument, NotificationRecipient } from '../schema/google-sheet-config.schema';
import { GoogleSheetTab, GoogleSheetTabDocument } from '../schema/google-sheet-tab.schema';
import { CreateGoogleCredentialDto } from '../dto/google-credential.dto';
import { ResetLeadDto } from 'src/modules/campaigns/outbound-campaign/dto/reset-lead.dto';
import { LeadsInQueueDocument, LeadsInQueueSchema } from 'src/modules/lead-management/schema/leads-in-queue.schema';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

export interface FieldMapping {
    index: number;
    field: string;
    type: string;
}

export const FIELD_ALIASES: Record<string, { type: 'string' | 'number' | 'date' | 'phone'; aliases: string[] }> = {
    // ── Shopify / legacy sheet mappings (kept for backward compatibility) ──
    name: { type: 'string', aliases: ['name', 'fullname', 'customername', 'clientname'] },
    phone: { type: 'phone', aliases: ['phone', 'mobile', 'contact', 'contactnumber'] },
    amount: { type: 'number', aliases: ['amount', 'price', 'totalamount', 'orderamount', 'totalprice', 'sellingprice'] },
    shopifyCustomerId: { type: 'string', aliases: ['shopifycustomerid', 'customerid'] },
    product1: { type: 'string', aliases: ['product', 'productname', 'product1', 'item', 'itemname'] },
    address: { type: 'string', aliases: ['address', 'customeraddress', 'shippingaddress', 'billingaddress', 'location'] },
    date: { type: 'date', aliases: ['date', 'orderdate', 'dateplaced'] },
    time: { type: 'string', aliases: ['time', 'ordertime'] },
    orderPlaced: { type: 'string', aliases: ['orderplaced', 'placed'] },
    orderId: { type: 'string', aliases: ['orderid', 'id', 'ordernumber'] },
    orderName: { type: 'string', aliases: ['ordername'] },
    orderCreatedAt: { type: 'date', aliases: ['ordercreatedat', 'createdat'] },
    mobileNumber: { type: 'string', aliases: ['mobilenumber'] },
    count: { type: 'number', aliases: ['count', 'quantity', 'qty'] },
    callingDate: { type: 'date', aliases: ['callingdate'] },
    agentName: { type: 'string', aliases: ['agentname', 'agent'] },
    finalConnected: { type: 'string', aliases: ['finalconnected', 'connected'] },
    finalSellingPrice: { type: 'number', aliases: ['finalsellingprice'] },
    finalMOP: { type: 'number', aliases: ['finalmop', 'mop'] },
    finalOrderPlaced: { type: 'string', aliases: ['finalorderplaced'] },
    callingStatus: { type: 'string', aliases: ['callingstatus', 'status'] },
    finalRemark: { type: 'string', aliases: ['finalremark', 'remark', 'remarks'] },
    extraRemarks: { type: 'string', aliases: ['extraremarks', 'notes'] },
    orderDate: { type: 'date', aliases: ['orderdate'] },
    month: { type: 'string', aliases: ['month'] },
    churnCount: { type: 'number', aliases: ['churncount', 'churn'] },
    lastCallDate: { type: 'date', aliases: ['lastcalldate'] },
    countType: { type: 'string', aliases: ['counttype'] },
    orderedMonth: { type: 'string', aliases: ['orderedmonth'] },
    leadsMonth: { type: 'string', aliases: ['leadsmonth'] },
    orderStatus: { type: 'string', aliases: ['orderstatus'] },

    // ── CRM-style headers → exact DB field name keys ──────────────────────
    // These keys match MongoDB field names directly, so payload[field] = value
    // writes to the correct field without any extra side-effects.
    first_name: { type: 'string', aliases: ['firstname', 'first name', 'first_name'] },
    last_name: { type: 'string', aliases: ['lastname', 'last name', 'last_name'] },
    phone_number: { type: 'phone', aliases: ['phonenumber', 'phone number', 'phone_number', 'phoneno', 'phone no'] },
    alternate_phone_number: { type: 'phone', aliases: ['alternatephonenumber', 'alternate phone number', 'alternate_phone_number', 'altphone', 'alternatephone', 'alt phone', 'alt phone number'] },
    postal_code: { type: 'string', aliases: ['postalcode', 'postal code', 'postal_code', 'zip', 'zipcode', 'pincode', 'pin code'] },
    dob: { type: 'string', aliases: ['dateofbirth', 'date of birth', 'dob', 'date_of_birth', 'birthdate'] },
    email: { type: 'string', aliases: ['email', 'emailaddress', 'email address', 'email_address'] },
    city: { type: 'string', aliases: ['city'] },
    state: { type: 'string', aliases: ['state'] },
    province: { type: 'string', aliases: ['province'] },
    gender: { type: 'string', aliases: ['gender', 'sex'] },
    description: { type: 'string', aliases: ['description', 'desc'] },
    campaign_name: { type: 'string', aliases: ['campaignname', 'campaign name', 'campaign_name'] },
};

export const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
    { index: 0, field: 'name', type: 'string' },
    { index: 1, field: 'phone', type: 'phone' },
    { index: 3, field: 'amount', type: 'number' },
    { index: 4, field: 'shopifyCustomerId', type: 'string' },
    { index: 5, field: 'product1', type: 'string' },
    { index: 6, field: 'address', type: 'string' },
    { index: 7, field: 'date', type: 'date' },
    { index: 8, field: 'time', type: 'string' },
    { index: 9, field: 'orderPlaced', type: 'string' },
    { index: 10, field: 'orderId', type: 'string' },
    { index: 11, field: 'orderName', type: 'string' },
    { index: 12, field: 'orderCreatedAt', type: 'date' },
    { index: 13, field: 'mobileNumber', type: 'string' },
    { index: 14, field: 'count', type: 'number' },
    { index: 15, field: 'callingDate', type: 'date' },
    { index: 16, field: 'agentName', type: 'string' },
    { index: 17, field: 'finalConnected', type: 'string' },
    { index: 18, field: 'finalSellingPrice', type: 'number' },
    { index: 19, field: 'finalMOP', type: 'number' },
    { index: 20, field: 'finalOrderPlaced', type: 'string' },
    { index: 21, field: 'callingStatus', type: 'string' },
    { index: 22, field: 'finalRemark', type: 'string' },
    { index: 23, field: 'extraRemarks', type: 'string' },
    { index: 24, field: 'orderDate', type: 'date' },
    { index: 25, field: 'month', type: 'string' },
    { index: 26, field: 'churnCount', type: 'number' },
    { index: 27, field: 'lastCallDate', type: 'date' },
    { index: 28, field: 'countType', type: 'string' },
    { index: 29, field: 'orderedMonth', type: 'string' },
    { index: 30, field: 'leadsMonth', type: 'string' },
    { index: 31, field: 'orderStatus', type: 'string' },
];

interface SheetTabInfo {
    sheetId: number;        // Google's numeric gid
    title: string;          // Tab name (= lead group name)
    position: number;       // Left-to-right order (0 = leftmost)
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SampannGoogleSheetService {

    private failedConfigs = new Set<string>();
    private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
    private summary: { totalSheets: number; totalTabs: number; totalRowsFetched: number; totalInsertedInLeadManagement: number; totalInsertedInGoogleSheetLeads: number; totalDuplicates: number; totalFailed: number; } = { totalSheets: 0, totalTabs: 0, totalRowsFetched: 0, totalInsertedInLeadManagement: 0, totalInsertedInGoogleSheetLeads: 0, totalDuplicates: 0, totalFailed: 0 };

    constructor(
        private readonly commonDbFn: CommonDBFunctions,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        private readonly leadManagementService: LeadManagementService,
        @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(GoogleSheet.name) private readonly googleSheetModel: Model<GoogleSheetDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        private readonly outboundCampaignService: OutboundCampaignService,
        @InjectModel(GoogleCredential.name) private readonly googleCredentialModel: Model<GoogleCredentialDocument>,
        @InjectModel(GoogleSheetConfig.name) private readonly googleConfigModel: Model<GoogleSheetConfigDocument>,
        @InjectModel(GoogleSheetTab.name) private readonly googleSheetTabModel: Model<GoogleSheetTabDocument>,
        private readonly blendedCampaignService: BlendedCampaignService,
    ) { }

    // =========================================================================
    // PUBLIC — cron entry point
    // =========================================================================

    /**
     * Called by the scheduler (e.g. every 15 minutes).
     *
     * For every active config the cron:
     *   1. Syncs tab metadata from the Google API (discovers new tabs).
     *   2. Checks if the current active tab is exhausted → promotes next tab.
     *   3. Imports leads for the currently active tab.
     *   4. After processing all configs: checks if every tab everywhere is
     *      exhausted → sends the global notification email once.
     */
    async callGoogleSheetCron(): Promise<any> {
        this.failedConfigs.clear();
        this.summary = { totalSheets: 0, totalTabs: 0, totalRowsFetched: 0, totalInsertedInLeadManagement: 0, totalInsertedInGoogleSheetLeads: 0, totalDuplicates: 0, totalFailed: 0 };
        // Auto-reset any exhausted configs that have new tabs added to the Google Sheet
        await this.checkExhaustedConfigsForNewTabs();
        // Always check for un-notified exhausted sheets first, regardless of active configs
        await this.checkGlobalExhaustion();
        // Check for un-notified exhausted tabs
        await this.checkTabExhaustion();

        const allActiveConfigs = await this.googleConfigModel
            .find({ all_tabs_exhausted: false, isActive: true })
            .lean<GoogleSheetConfig[]>();
        if (!allActiveConfigs.length) {
            console.log('[GoogleSheetService] No active sheet configs to process.');
            return this.summary;
        }

        console.log(
            `[GoogleSheetService] Active configs to process: ${allActiveConfigs.length}. ` +
            `Sheet IDs: [${allActiveConfigs.map(c => c.sheet_id).join(', ')}]`,
        );

        // ── Phase 1: Tab Discovery ────────────────────────────────────────────
        // Runs for EVERY active config simultaneously, regardless of campaign
        // grouping.  This is the ONLY place tabs are discovered and Lead Groups
        // are pre-created.  It is decoupled from the lead-import phase so that
        // sheets skipped by the sequential-per-campaign logic still get all
        // their tabs discovered and Lead Groups created upfront.
        console.log(`[GoogleSheetService] ========== PHASE 1: TAB DISCOVERY (${allActiveConfigs.length} sheets) ==========`);
        const discoveryResults = await Promise.allSettled(
            allActiveConfigs.map(cfg => this.discoverTabsForConfig(cfg)),
        );
        const discoverySucceeded = discoveryResults.filter(r => r.status === 'fulfilled').length;
        const discoveryFailed = discoveryResults.filter(r => r.status === 'rejected').length;
        const totalTabsInDb = await this.googleSheetTabModel.countDocuments({});
        console.log(
            `[GoogleSheetService] Phase 1 Complete. ` +
            `Sheets succeeded: ${discoverySucceeded}, failed: ${discoveryFailed}. ` +
            `Total tab records in DB: ${totalTabsInDb}.`,
        );

        // ── Phase 2: Lead Import ──────────────────────────────────────────────
        // Sequential per campaign: only the first (oldest) config per campaign
        // imports leads; the rest wait until it is exhausted.
        console.log(`[GoogleSheetService] ========== PHASE 2: LEAD IMPORT (sequential per campaign) ==========`);
        // Group configs by campaign
        // ── Phase 2: Lead Import (all sheets in parallel, tabs sequential per sheet) ──
        //
        // Every active Google Sheet is processed independently and simultaneously.
        // Within each sheet, the tab state machine is:
        //   Tab 1 → active (leads imported) → exhausted → Tab 2 activated → ...
        // No sheet waits for another sheet to finish.
        console.log(`[GoogleSheetService] ========== PHASE 2: LEAD IMPORT (${allActiveConfigs.length} sheets, parallel — independent per sheet) ==========`);
        allActiveConfigs.forEach((cfg, idx) => {
            console.log(
                `[GoogleSheetService] Phase 2 Queue [${idx + 1}/${allActiveConfigs.length}]: ` +
                `sheet_id=${cfg.sheet_id} | config_uuid=${cfg.uuid} | campaign_uuid=${cfg.campaign_uuid ?? 'none'}`,
            );
        });

        this.summary.totalSheets = allActiveConfigs.length;
        await Promise.allSettled(allActiveConfigs.map(cfg => this.processConfig(cfg)));

        // Final summary
        this.summary.totalTabs = await this.googleSheetTabModel.countDocuments({});
        const totalLeadGroups = await this.lead_group.countDocuments({});
        console.log(
            `[GoogleSheetService] ========== PROCESSING COMPLETE ==========\n` +
            `  Total Active Sheets : ${allActiveConfigs.length}\n` +
            `  Total Tab Records   : ${this.summary.totalTabs}\n` +
            `  Total Lead Groups   : ${totalLeadGroups}\n` +
            `  Rows Fetched        : ${this.summary.totalRowsFetched}\n` +
            `  Leads Imported      : ${this.summary.totalInsertedInLeadManagement}\n` +
            `  Duplicates Skipped  : ${this.summary.totalDuplicates}\n` +
            `  Failed Rows         : ${this.summary.totalFailed}`,
        );
        console.log('[GoogleSheetService] Full summary object:', this.summary);
    }

    // =========================================================================
    // PUBLIC — parallel tab & lead-group sync across ALL active sheets
    // =========================================================================

    /**
     * Fetches all tabs from every active Google Sheet configuration simultaneously.
     * For each tab it:
     *   1. Upserts a GoogleSheetTab document (idempotent — no duplicates).
     *   2. Ensures a LeadGroup exists for the tab and stores lead_group_uuid.
     *
     * Safe to run multiple times — repeated executions produce the same state.
     */
    async syncAllTabsFromAllActiveSheets(): Promise<{
        processedSheets: number;
        processedTabs: number;
        createdLeadGroups: number;
        errors: string[];
    }> {
        const label = '[SyncAllTabs]';
        console.log(`${label} Starting parallel tab sync for all active Google Sheet configs.`);

        const activeConfigs = await this.googleConfigModel
            .find({ isActive: true })
            .lean<GoogleSheetConfig[]>();

        if (!activeConfigs.length) {
            console.log(`${label} No active sheet configs found.`);
            return { processedSheets: 0, processedTabs: 0, createdLeadGroups: 0, errors: [] };
        }

        console.log(`${label} Found ${activeConfigs.length} active config(s). Processing in parallel...`);

        const results = await Promise.all(
            activeConfigs.map(cfg => this.syncTabsForConfig(cfg, label)),
        );

        // Aggregate results
        const summary = results.reduce(
            (acc, r) => ({
                processedSheets: acc.processedSheets + 1,
                processedTabs: acc.processedTabs + r.tabsProcessed,
                createdLeadGroups: acc.createdLeadGroups + r.leadGroupsCreated,
                errors: [...acc.errors, ...r.errors],
            }),
            { processedSheets: 0, processedTabs: 0, createdLeadGroups: 0, errors: [] as string[] },
        );

        console.log(`${label} Completed. Summary:`, summary);
        return summary;
    }

    /**
     * Processes a single config: fetches live tabs, upserts metadata,
     * and ensures a LeadGroup for every tab.
     */
    private async syncTabsForConfig(
        cfg: GoogleSheetConfig,
        parentLabel: string,
    ): Promise<{ tabsProcessed: number; leadGroupsCreated: number; errors: string[] }> {
        const label = `${parentLabel}[${cfg.tenant_uuid}][${cfg.sheet_id}]`;
        const result = { tabsProcessed: 0, leadGroupsCreated: 0, errors: [] as string[] };

        try {
            const credential = await this.googleCredentialModel
                .findOne({ uuid: cfg.credential_uuid })
                .lean<GoogleCredential>();

            if (!credential) {
                const msg = `Credential not found for config ${cfg.uuid} (credential_uuid: ${cfg.credential_uuid})`;
                console.error(`${label} ${msg}`);
                result.errors.push(msg);
                return result;
            }

            const liveTabs = await this.fetchTabList(cfg, credential, label);
            if (!liveTabs || liveTabs.length === 0) {
                const msg = `No tabs found (or API error) for sheet ${cfg.sheet_id}`;
                console.warn(`${label} ${msg}`);
                result.errors.push(msg);
                return result;
            }

            console.log(`${label} ${liveTabs.length} tab(s) found. Syncing metadata + lead groups in parallel...`);

            // Process every tab for this config in parallel
            const tabResults = await Promise.all(
                liveTabs.map(tab => this.syncSingleTab(cfg, tab, credential, label)),
            );

            for (const tr of tabResults) {
                result.tabsProcessed++;
                if (tr.leadGroupCreated) result.leadGroupsCreated++;
                if (tr.error) result.errors.push(tr.error);
            }

        } catch (err: any) {
            const msg = `Unhandled error for config ${cfg.uuid}: ${err?.message ?? err}`;
            console.error(`${label} ${msg}`);
            result.errors.push(msg);
        }

        return result;
    }

    /**
     * Upserts a single tab document into google_sheet_tabs and ensures a
     * LeadGroup exists, writing lead_group_uuid back to the tab document.
     */
    private async syncSingleTab(
        cfg: GoogleSheetConfig,
        tab: SheetTabInfo,
        credential: GoogleCredential,
        label: string,
    ): Promise<{ leadGroupCreated: boolean; error?: string }> {
        try {
            // 1. Upsert tab metadata — idempotent
            const tabDoc = await this.googleSheetTabModel.findOneAndUpdate(
                { config_uuid: cfg.uuid, sheet_gid: tab.sheetId },
                {
                    $setOnInsert: {
                        config_uuid: cfg.uuid,
                        tenant_uuid: cfg.tenant_uuid,
                        sheet_gid: tab.sheetId,
                        status: 'pending',
                        total_leads: 0,
                        remaining_leads: 0,
                        activated_at: null,
                        exhausted_at: null,
                    },
                    $set: {
                        tab_name: tab.title,
                        position: tab.position,
                        campaign_uuid: cfg.campaign_uuid ?? null,
                        google_sheet_uuid: cfg.uuid,
                    },
                },
                { upsert: true, new: true },
            ).lean<GoogleSheetTab>();

            // 2. Ensure lead group and persist uuid back to the tab doc
            let leadGroupCreated = false;
            const existingUuid = tabDoc?.lead_group_uuid;

            const leadGroup = await this.ensureLeadGroup(cfg, tab.title);

            if (!existingUuid || existingUuid !== leadGroup.uuid?.toString()) {
                await this.googleSheetTabModel.updateOne(
                    { config_uuid: cfg.uuid, sheet_gid: tab.sheetId },
                    { $set: { lead_group_uuid: leadGroup.uuid?.toString() } },
                );
                leadGroupCreated = !existingUuid; // truly new only if there was no uuid before
                console.log(
                    `${label} Tab "${tab.title}" → lead_group_uuid=${leadGroup.uuid} ${leadGroupCreated ? '(newly created)' : '(reused)'}`,
                );
            } else {
                console.log(`${label} Tab "${tab.title}" already has lead_group_uuid=${existingUuid} — skipping update.`);
            }

            return { leadGroupCreated };
        } catch (err: any) {
            const msg = `Error syncing tab "${tab.title}" (gid ${tab.sheetId}): ${err?.message ?? err}`;
            console.error(`${label} ${msg}`);
            return { leadGroupCreated: false, error: msg };
        }
    }

    // =========================================================================
    // PUBLIC — credential management
    // =========================================================================

    async createCredential(dto: CreateGoogleCredentialDto) {
        const logMessages = {
            logErrorMsg: 'Google Credential already exists\n',
            logSuccessMsg: 'Google Credential created successfullyy\n',
        };
        return this.commonDbFn.findAndInsert(
            this.googleCredentialModel,

            { tenant_uuid: dto.tenant_uuid },
            dto,
            JSON.stringify(logMessages),
        );
    }

    async generateAccessToken(credentialUuid?: string) {
        const credential = credentialUuid
            ? await this.googleCredentialModel.findOne({ uuid: credentialUuid })
            : await this.getActiveCredential();

        const jwtClient = this.buildJwtClient(credential);
        const token = await jwtClient.authorize();
        if (!token?.access_token) throw new Error('No access token received from Google');

        await this.googleCredentialModel.updateOne(
            { _id: credential._id },
            {
                access_token: token.access_token,
                refresh_token: token.refresh_token ?? null,
                token_expiry: token.expiry_date ? new Date(token.expiry_date) : null,
            },
            { upsert: true },
        );

        return {
            statusCode: 200,
            message: 'Token generated/updated successfully',
            accessToken: token.access_token,
            tokenExpiry: token.expiry_date ? new Date(token.expiry_date) : null,
        };
    }

    // =========================================================================
    // PRIVATE — per-config orchestration
    // =========================================================================

    private async processConfig(cfg: GoogleSheetConfig): Promise<void> {
        const label = `[GoogleSheetService][${cfg.tenant_uuid}][${cfg.sheet_id}]`;

        try {
            const credential = await this.googleCredentialModel.findOne({ uuid: cfg.credential_uuid }).lean<GoogleCredential>();
            if (!credential) {
                console.error(`${label} Credential not found: ${cfg.credential_uuid}`);
                return;
            }

            // ── Step 1: Sync tabs from Google API ─────────────────────────
            const liveTabs = await this.fetchTabList(cfg, credential, label);
            if (!liveTabs) {
                console.error(`${label} Could not fetch tab list.`);
                return;
            }
            console.log(`${label} Total tabs found: ${liveTabs.length}. Tabs: [${liveTabs.map(t => `"${t.title}" (gid=${t.sheetId}, pos=${t.position})`).join(', ')}]`);
            // Update summary
            this.summary.totalTabs += liveTabs.length;
            await this.syncTabMetadata(cfg, liveTabs, label);

            // ── Step 1.5: Pre-create Lead Groups for ALL tabs in parallel ──
            // Ensures every tab has a Lead Group ready before it becomes active.
            // Only the FIRST (leftmost) tab will be activated for lead import;
            // remaining tabs stay 'pending' until their predecessor is exhausted.
            await this.ensureLeadGroupsForAllTabs(cfg, liveTabs, label);

            // ── Step 2: Check if active tab is exhausted → promote ────────
            await this.advanceActiveTabIfExhausted(cfg, label);

            // ── Step 3: Re-fetch config after mutations ───────────────────
            const freshCfg = await this.googleConfigModel.findOne({ uuid: cfg.uuid }).lean<GoogleSheetConfig>();
            if (!freshCfg || freshCfg.all_tabs_exhausted) {
                console.log(`${label} All tabs exhausted — skipping import.`);
                return;
            }

            // ── Step 4: Import leads for ALL tabs (parallel, each tab isolated) ───
            const allTabs = await this.googleSheetTabModel
                .find({ config_uuid: cfg.uuid })
                .lean<GoogleSheetTab[]>();

            if (!allTabs.length) {
                console.log(`${label} No tab docs found for this config — nothing to import.`);
                return;
            }

            console.log(
                `${label} ═══ PROCESSING ALL ${allTabs.length} TAB(S) ═══ ` +
                `[${allTabs.map(t => `"${t.tab_name}" (gid=${t.sheet_gid}, status=${t.status})`).join(', ')}]`,
            );

            await Promise.allSettled(
                allTabs.map(async (tab) => {
                    try {
                        console.log(
                            `${label} ─── TAB: "${tab.tab_name}" ` +
                            `(gid=${tab.sheet_gid}, lead_group_uuid=${tab.lead_group_uuid ?? 'not set'}) ───`,
                        );
                        await this.importTabLeads(freshCfg, tab, credential, label);
                        await this.syncLeadStatusToSheet(freshCfg, tab, credential, label);
                    } catch (tabErr: any) {
                        console.error(
                            `${label} Tab "${tab.tab_name}" (gid=${tab.sheet_gid}) failed:`,
                            tabErr?.message ?? tabErr,
                        );
                    }
                }),
            );

            // Re‑evaluate tab exhaustion so the state-machine can advance when needed
            await this.advanceActiveTabIfExhausted(freshCfg, label);

        } catch (err: any) {
            console.error(`${label} Unhandled error:`, err?.message ?? err);
        }
    }

    // =========================================================================
    // PRIVATE — tab discovery & sync
    // =========================================================================

    /**
     * Discovers all tabs for a single config, syncs metadata, and pre-creates
     * Lead Groups for every tab.  Called by Phase 1 of callGoogleSheetCron
     * for ALL active configs — independent of the per-campaign sequential logic.
     */
    private async discoverTabsForConfig(cfg: GoogleSheetConfig): Promise<void> {
        const label = `[TabDiscovery][${cfg.tenant_uuid}][${cfg.sheet_id}]`;
        try {
            console.log(`${label} ── Discovering tabs for sheet_id=${cfg.sheet_id} (config_uuid=${cfg.uuid}) ──`);

            const credential = await this.googleCredentialModel
                .findOne({ uuid: cfg.credential_uuid })
                .lean<GoogleCredential>();

            if (!credential) {
                console.error(`${label} Credential not found (credential_uuid=${cfg.credential_uuid}). Skipping this sheet.`);
                return;
            }

            const liveTabs = await this.fetchTabList(cfg, credential, label);
            if (!liveTabs || liveTabs.length === 0) {
                console.error(`${label} No tabs returned for sheet_id=${cfg.sheet_id}. Check credentials and sheet permissions.`);
                return;
            }

            console.log(
                `${label} Fetched ${liveTabs.length} tab(s): ` +
                `[${liveTabs.map(t => `"${t.title}" (gid=${t.sheetId}, pos=${t.position})`).join(', ')}]`,
            );

            await this.syncTabMetadata(cfg, liveTabs, label);
            console.log(`${label} Tab metadata saved: ${liveTabs.length} tab record(s) upserted into google_sheet_tabs.`);

            await this.ensureLeadGroupsForAllTabs(cfg, liveTabs, label);
            console.log(`${label} Lead Groups ensured for all ${liveTabs.length} tab(s) of sheet_id=${cfg.sheet_id}.`);

            // Ensure the first tab is marked ACTIVE before processing begins.
            // This runs BEFORE the lead-import phase so every sheet has an
            // active tab ready when processConfig() executes.
            await this.activateFirstTabIfNoneActive(cfg, label);

        } catch (err: any) {
            console.error(`${label} discoverTabsForConfig error for sheet_id=${cfg.sheet_id}:`, err?.message ?? err);
        }
    }

    /**
     * Sets the first (leftmost by position) pending tab as active for the given
     * config, but ONLY if no active tab is currently set AND verified in the DB.
     *
     * Idempotent — skips if a tab with status='active' already exists for this config.
     */
    private async activateFirstTabIfNoneActive(
        cfg: GoogleSheetConfig,
        label: string,
    ): Promise<void> {
        // Re-fetch to get the freshest active_tab_gid
        const freshCfg = await this.googleConfigModel
            .findOne({ uuid: cfg.uuid })
            .lean<GoogleSheetConfig>();

        if (!freshCfg) return;

        if (freshCfg.active_tab_gid != null) {
            // Verify the tab the config points to actually has status='active'
            // (it may have been re-created as 'pending' after a collection reset)
            const verifiedActive = await this.googleSheetTabModel
                .findOne({ config_uuid: cfg.uuid, sheet_gid: freshCfg.active_tab_gid, status: 'active' })
                .lean<GoogleSheetTab>();

            if (verifiedActive) {
                console.log(
                    `${label} [FirstTabActivation] Tab "${verifiedActive.tab_name}" ` +
                    `(gid=${freshCfg.active_tab_gid}) is already ACTIVE — no change needed.`,
                );
                return;
            }

            // active_tab_gid is set but the tab is NOT active (pending/exhausted/missing)
            // advanceActiveTabIfExhausted will handle the correct state transition.
            console.log(
                `${label} [FirstTabActivation] active_tab_gid=${freshCfg.active_tab_gid} set ` +
                `but tab is not active — state will be corrected by advanceActiveTabIfExhausted.`,
            );
            return;
        }

        // active_tab_gid is null — find and activate the first pending tab
        const firstPendingTab = await this.googleSheetTabModel
            .findOne({ config_uuid: cfg.uuid, status: 'pending' })
            .sort({ position: 1 })
            .lean<GoogleSheetTab>();

        if (!firstPendingTab) {
            console.log(`${label} [FirstTabActivation] No pending tabs found — nothing to activate.`);
            return;
        }

        await this.googleSheetTabModel.updateOne(
            { _id: (firstPendingTab as any)._id },
            { $set: { status: 'active', activated_at: new Date() } },
        );
        await this.googleConfigModel.updateOne(
            { uuid: cfg.uuid },
            { $set: { active_tab_gid: firstPendingTab.sheet_gid } },
        );

        console.log(
            `${label} [FirstTabActivation] First tab activated before processing:\n` +
            `  Sheet ID       : ${cfg.sheet_id}\n` +
            `  Tab Name       : ${firstPendingTab.tab_name}\n` +
            `  Tab GID        : ${firstPendingTab.sheet_gid}\n` +
            `  Position       : ${firstPendingTab.position}\n` +
            `  Lead Group UUID: ${firstPendingTab.lead_group_uuid ?? 'not yet set'}`,
        );
    }

    /**
     * Fetches the live list of tabs (worksheets) from the Google Sheets API.
     * Returns them sorted left-to-right by their index position.
     */
    private async fetchTabList(cfg: GoogleSheetConfig, credential: GoogleCredential, label: string): Promise<SheetTabInfo[] | null> {
        try {
            const jwtClient = this.buildJwtClient(credential);
            const token = await jwtClient.authorize();
            if (!token?.access_token) throw new Error('No access token');

            const res = await axios.get(
                `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheet_id}`,
                {
                    headers: { Authorization: `Bearer ${token.access_token}` },
                    params: { fields: 'sheets.properties(sheetId,title,index,hidden)' },
                    timeout: cfg.timeout_ms ?? 30_000,
                },
            );

            const tabs: SheetTabInfo[] = (res.data.sheets ?? [])
                .filter((s: any) => !s.properties.hidden)        // skip hidden tabs
                .map((s: any) => ({
                    sheetId: s.properties.sheetId,
                    title: s.properties.title,
                    position: s.properties.index,                // left-to-right order
                }))
                .sort((a: SheetTabInfo, b: SheetTabInfo) => a.position - b.position);

            console.log(`${label} Found ${tabs.length} visible tab(s): ${tabs.map(t => `"${t.title}"`).join(', ')}`);
            return tabs;

        } catch (err: any) {
            console.error(`${label} Failed to fetch tab list for sheet_id=${cfg.sheet_id} (credential_uuid=${cfg.credential_uuid}):`, err?.message ?? err);
            console.error(`${label} Hint: If error is "scopes.split is not a function", the credential's scopes field is an array — this is now handled automatically.`);
            console.error(`${label} Hint: If error is 403, the service account email (${label}) does not have access to the spreadsheet.`);
            return null;
        }
    }

    /**
     * Upserts a GoogleSheetTab document for each live tab.
     * Updates position for tabs that may have been reordered.
     * Never deletes existing tab docs (preserves history).
     */
    private async syncTabMetadata(
        cfg: GoogleSheetConfig,
        liveTabs: SheetTabInfo[],
        label: string,
    ): Promise<void> {
        for (const tab of liveTabs) {
            await this.googleSheetTabModel.findOneAndUpdate(
                {
                    config_uuid: cfg.uuid,
                    sheet_gid: tab.sheetId,
                },
                {
                    $setOnInsert: {
                        config_uuid: cfg.uuid,
                        tenant_uuid: cfg.tenant_uuid,
                        sheet_gid: tab.sheetId,
                        status: 'pending',
                        lead_group_uuid: null,
                        total_leads: 0,
                        remaining_leads: 0,
                        activated_at: null,
                        exhausted_at: null,
                    },
                    $set: {
                        position: tab.position,
                        tab_name: tab.title,
                    },
                },
                {
                    upsert: true,
                    new: true,
                },
            );
        }

        console.log(`${label} Tab metadata synced for ${liveTabs.length} tab(s).`);
    }

    /**
     * Pre-creates a LeadGroup for EVERY discovered tab in parallel.
     *
     * This guarantees that all Lead Groups are ready in the database before any
     * tab is activated, so activateNextPendingTab can rely on the uuid already
     * being set.  The method is idempotent — tabs that already have a
     * lead_group_uuid are silently skipped.
     *
     * Tab activation order is NOT changed here: only the first pending tab (by
     * position) will be marked active by advanceActiveTabIfExhausted; the rest
     * remain 'pending'.
     */
    private async ensureLeadGroupsForAllTabs(
        cfg: GoogleSheetConfig,
        liveTabs: SheetTabInfo[],
        label: string,
    ): Promise<void> {
        const sortedTabs = [...liveTabs].sort((a, b) => a.position - b.position);
        const firstTab = sortedTabs[0];

        console.log(
            `${label} [LeadGroupSync] Pre-creating Lead Groups for ${sortedTabs.length} tab(s). ` +
            `First tab (will be activated): "${firstTab?.title}". ` +
            `Remaining tabs (will stay pending): [${sortedTabs.slice(1).map(t => `"${t.title}"`).join(', ')}].`,
        );

        await Promise.all(
            sortedTabs.map(async (tab, idx) => {
                try {
                    // Check if the tab doc already has a lead_group_uuid
                    const tabDoc = await this.googleSheetTabModel
                        .findOne({ config_uuid: cfg.uuid, sheet_gid: tab.sheetId })
                        .lean<GoogleSheetTab>();

                    if (tabDoc?.lead_group_uuid) {
                        console.log(
                            `${label} [LeadGroupSync] Tab "${tab.title}" (pos=${tab.position}) ` +
                            `already has lead_group_uuid=${tabDoc.lead_group_uuid} — skipping creation.`,
                        );
                        return;
                    }

                    // Create or reuse the LeadGroup
                    const leadGroup = await this.ensureLeadGroup(cfg, tab.title);
                    const leadGroupUuid = leadGroup.uuid?.toString();

                    // Persist uuid back to the tab document
                    await this.googleSheetTabModel.updateOne(
                        { config_uuid: cfg.uuid, sheet_gid: tab.sheetId },
                        { $set: { lead_group_uuid: leadGroupUuid } },
                    );

                    const role = idx === 0 ? 'ACTIVE (first tab — leads will import)' : 'PENDING (awaiting predecessor)';
                    console.log(
                        `${label} [LeadGroupSync] Tab "${tab.title}" (pos=${tab.position}, ${role}) ` +
                        `→ lead_group_uuid=${leadGroupUuid} stored.`,
                    );
                } catch (err: any) {
                    console.error(
                        `${label} [LeadGroupSync] Failed for tab "${tab.title}" (gid=${tab.sheetId}):`,
                        err?.message ?? err,
                    );
                }
            }),
        );

        console.log(`${label} [LeadGroupSync] Lead Group pre-creation complete for all ${sortedTabs.length} tab(s).`);
    }

    // =========================================================================
    // PRIVATE — tab advancement logic
    // =========================================================================

    /**
     * Core state-machine:
     *
     *  1. No active tab (active_tab_gid == null) → activate leftmost pending tab.
     *  2. Active tab GID set but tab doc missing  → reset + activate leftmost pending.
     *  3. Tab doc found, status == 'pending'       → the tab was freshly re-created
     *                                                after a reset; activate it now.
     *  4. Tab doc found, status == 'exhausted'     → already exhausted; find next.
     *  5. Tab doc found, status == 'active'        → check if leads are consumed;
     *                                                if yes: exhaust + advance.
     */
    private async advanceActiveTabIfExhausted(cfg: GoogleSheetConfig, label: string): Promise<void> {

        // ── Case A: No active tab yet ──────────────────────────────────────
        if (cfg.active_tab_gid == null) {
            console.log(`${label} [TabState] No active tab set — activating first pending tab.`);
            await this.activateNextPendingTab(cfg, null, label);
            return;
        }

        // ── Find the tab doc the config is pointing to ──────────────────
        const activeTab = await this.googleSheetTabModel
            .findOne({ config_uuid: cfg.uuid, sheet_gid: cfg.active_tab_gid })
            .lean<GoogleSheetTab>();

        // ── Case B: Tab doc missing (collection reset or deleted) ────────
        if (!activeTab) {
            console.warn(
                `${label} [TabState] active_tab_gid=${cfg.active_tab_gid} points to a tab that ` +
                `no longer exists in google_sheet_tabs. Resetting and activating first pending tab.`,
            );
            await this.googleConfigModel.updateOne(
                { uuid: cfg.uuid },
                { $set: { active_tab_gid: null } },
            );
            await this.activateNextPendingTab(cfg, null, label);
            return;
        }

        // ── Case C: Tab is 'pending' (freshly re-created after a reset) ───
        // The config still remembers the old active GID, but the tab doc was
        // re-inserted as 'pending'. Activate it without exhaustion check.
        if (activeTab.status === 'pending') {
            console.log(
                `${label} [TabState] Tab "${activeTab.tab_name}" is 'pending' ` +
                `(re-created after collection reset) — activating it now.`,
            );
            await this.googleSheetTabModel.updateOne(
                { _id: (activeTab as any)._id },
                { $set: { status: 'active', activated_at: new Date() } },
            );
            return;
        }

        // ── Case D: Tab already exhausted ─────────────────────────────
        if (activeTab.status === 'exhausted') {
            console.log(`${label} [TabState] Tab "${activeTab.tab_name}" already exhausted — advancing.`);
            await this.activateNextPendingTab(cfg, null, label);
            return;
        }

        // ── Case E: Tab is 'active' — check if leads are consumed ───────
        const isExhausted = await this.isTabExhausted(activeTab, cfg, label);
        if (!isExhausted) {
            console.log(`${label} [TabState] Tab "${activeTab.tab_name}" still has callable leads — continuing.`);
            return;
        }

        // Mark current tab exhausted then advance
        await this.googleSheetTabModel.updateOne(
            { _id: (activeTab as any)._id },
            { $set: { status: 'exhausted', exhausted_at: new Date(), remaining_leads: 0 } },
        );
        console.log(`${label} Tab "${activeTab.tab_name}" marked exhausted.`);

        // Activate the next one
        // await this.activateNextPendingTab(cfg, activeTab.position, label);
        await this.activateNextPendingTab(cfg, null, label);
    }

    /**
     * Checks whether the active tab has zero callable leads remaining.
     *
     * IMPORTANT: A tab with total_leads = 0 has never been imported.
     * It is NOT exhausted — it simply hasn’t had its leads fetched yet.
     * Only tabs that were imported (total_leads > 0) and then fully consumed
     * should be considered exhausted.
     */
    private async isTabExhausted(tab: GoogleSheetTab, cfg: GoogleSheetConfig, label: string): Promise<boolean> {
        if (!tab.lead_group_uuid) {
            // Tab has no lead group yet — never imported, not exhausted
            console.log(`${label} [Exhaustion] Tab "${tab.tab_name}" has no lead_group_uuid — not imported yet, NOT exhausted.`);
            return false;
        }

        // ── KEY GUARD: if leads have NEVER been imported, the tab is not exhausted ──
        // total_leads is set to dataRows.length inside importTabLeads().
        // A value of 0 means the import has not run yet.
        if (!tab.total_leads || tab.total_leads === 0) {
            console.log(`${label} [Exhaustion] Tab "${tab.tab_name}" has total_leads=0 (never imported) — NOT exhausted.`);
            return false;
        }

        // Count actual callable leads in lead_management
        const remaining = await this.lead_management.countDocuments({
            lead_group_uuid: tab.lead_group_uuid,
            lead_status: cfg.lead_status,
        });

        // Count leads actively in the dialler queue for this tab
        const activeInQueue = await this.leads_in_queue.countDocuments({
            campaign_uuid: cfg.campaign_uuid,
            lead_group_uuid: tab.lead_group_uuid,
        });

        console.log(
            `${label} [Exhaustion] Tab "${tab.tab_name}" — ` +
            `total_leads=${tab.total_leads}, remaining callable=${remaining}, in queue=${activeInQueue}`,
        );

        // Update snapshot counter for observability
        await this.googleSheetTabModel.updateOne(
            { _id: (tab as any)._id },
            { $set: { remaining_leads: remaining } },
        );

        return remaining === 0 && activeInQueue === 0;
    }

    /**
     * Finds the leftmost pending tab (by position) after the given position
     * and marks it as active on both the tab doc and the config.
     * If no pending tab is found, marks the config as fully exhausted.
     */
    private async activateNextPendingTab(cfg: GoogleSheetConfig, afterPosition: number | null, label: string): Promise<void> {
        const query: any = { config_uuid: cfg.uuid, status: 'pending' };
        if (afterPosition !== null) {
            query.position = { $gt: afterPosition };
        }

        const nextTab = await this.googleSheetTabModel
            .findOne(query)
            .sort({ position: 1 })
            .lean<GoogleSheetTab>();

        // if (!nextTab) {
        //     console.log(`${label} No more pending tabs — marking config as all_tabs_exhausted.`);
        //     await this.googleConfigModel.updateOne(
        //         { uuid: cfg.uuid },
        //         { all_tabs_exhausted: true, active_tab_gid: null },
        //     );
        //     return;
        // }
        if (!nextTab) {
            console.log(`${label} No more pending tabs — checking if all tabs are exhausted before updating config.`);
            await this.googleConfigModel.updateOne(
                { uuid: cfg.uuid },
                { $set: { active_tab_gid: null } },
            );
            await this.checkConfigExhaustion(cfg.uuid, label);
            return;
        }

        // Create / reuse a lead group named after the tab
        const leadGroup = await this.ensureLeadGroup(cfg, nextTab.tab_name);

        await this.googleSheetTabModel.updateOne(
            { _id: (nextTab as any)._id },
            { status: 'active', activated_at: new Date(), lead_group_uuid: leadGroup.uuid.toString() },
        );

        await this.googleConfigModel.updateOne(
            { uuid: cfg.uuid },
            { active_tab_gid: nextTab.sheet_gid },
        );

        console.log(`${label} Activated tab "${nextTab.tab_name}" (gid ${nextTab.sheet_gid}).`);
    }

    // =========================================================================
    // PRIVATE — lead group helpers
    // =========================================================================

    /**
     * Finds or creates a LeadGroup whose name equals the tab name.
     * This is the "Number List ID = tab name" requirement.
     */
    private async ensureLeadGroup(cfg: GoogleSheetConfig, tabName: string): Promise<any> {
        const existing = await this.lead_group.findOne({ name: tabName, campaign_uuid: cfg.campaign_uuid });
        if (existing) {
            console.log(`[GoogleSheetService] Reusing LeadGroup "${tabName}".`);
            return existing;
        }

        const created = await this.lead_group.create({
            name: tabName,      // ← tab name IS the lead group name
            description: tabName,
            status: '0',
            user_group_uuid: cfg.user_group_uuid,
            campaign_uuid: cfg.campaign_uuid,
            tenant_uuid: cfg.tenant_uuid,
            role: 'tenant',
            human_answer: 0,
            sale: 0,
            totalLeadCount: 0,
            campaign_flag: cfg.campaign_flag ?? 'blended',
        });

        console.log(`[GoogleSheetService] Created LeadGroup "${tabName}".`);
        return created;
    }

    // =========================================================================
    // PRIVATE — lead import
    // =========================================================================

    private async importTabLeads(
        cfg: GoogleSheetConfig,
        activeTab: GoogleSheetTab,
        credential: GoogleCredential,
        label: string,
    ): Promise<void> {
        let headers: string[] = [];
        let dataRows: any[] = [];

        // Determine starting row. If it starts at row > 1 (e.g. A2:Z), fetch from row 1 to get headers.
        const startRowMatch = cfg.range_without_tab.match(/^([A-Za-z]+)(\d+)/);
        if (startRowMatch && parseInt(startRowMatch[2], 10) > 1) {
            const rangeWithHeaders = cfg.range_without_tab.replace(/^([A-Za-z]+)\d+/, '$11');
            const range = `${activeTab.tab_name}!${rangeWithHeaders}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheet_id}/values/${encodeURIComponent(range)}`;
            const allRows = await this.fetchSheetDataWithRetry(url, cfg, credential, label);
            if (allRows && allRows.length > 0) {
                headers = allRows[0];
                dataRows = allRows.slice(1);
            }
        } else {
            const range = `${activeTab.tab_name}!${cfg.range_without_tab}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheet_id}/values/${encodeURIComponent(range)}`;
            const allRows = await this.fetchSheetDataWithRetry(url, cfg, credential, label);
            if (allRows && allRows.length > 0) {
                headers = allRows[0];
                dataRows = allRows.slice(1);
            }
        }

        if (!headers || headers.length === 0) {
            console.error(`${label} Failed to fetch data or headers for tab "${activeTab.tab_name}".`);
            return;
        }

        // Initialize tab metrics and mark as active
        await this.googleSheetTabModel.updateOne(
            { config_uuid: cfg.uuid, sheet_gid: activeTab.sheet_gid },
            {
                $set: {
                    totalRows: dataRows.length,
                    total_leads: dataRows.length,
                    remaining_leads: dataRows.length,
                    status: 'active',
                    activated_at: new Date(),
                },
            },
            { upsert: true },
        );

        const dynamicMappings = this.buildDynamicMappings(headers, label);
        if (dynamicMappings.length > 0) {
            cfg.field_mappings = dynamicMappings;
        } else {
            console.warn(`${label} Dynamic header mapping found no matching columns. Falling back to static DEFAULT_FIELD_MAPPINGS.`);
            cfg.field_mappings = DEFAULT_FIELD_MAPPINGS;
        }
        // Track rows fetched for this tab
        this.summary.totalRowsFetched += dataRows.length;
        console.log(`${label} Rows fetched from tab "${activeTab.tab_name}": ${dataRows.length}`);
        await this.processFilteredRows(dataRows, cfg, activeTab, label);
        // After processing all rows, mark the tab as exhausted
        // After processing all rows, keep the tab as active for call handling
        await this.googleSheetTabModel.updateOne(
            { config_uuid: cfg.uuid, sheet_gid: activeTab.sheet_gid },
            {
                $set: {
                    // status remains 'active' until leads are exhausted
                    // exhausted_at is not set here; will be set when all leads are called
                    remaining_leads: dataRows.length,
                },
            },
        );
    }
    private async processFilteredRows(
        rows: any[],
        cfg: GoogleSheetConfig,
        activeTab: GoogleSheetTab,
        label: string,
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        const parsedRows = rows
            .map((row, index) => ({
                row,
                sheetDate: today,
                row_number: index + 2
            }))
            .filter((item) => item.row && item.row.length > 0);

        if (!parsedRows.length) {
            console.log(`${label} No rows found to process.`);
            return;
        }

        await this.processBucket(today, parsedRows, cfg, activeTab, label);
    }

    private async processBucket(
        sheetDate: string,
        parsedRows: { row: any[]; sheetDate: string; row_number: number }[],
        cfg: GoogleSheetConfig,
        activeTab: GoogleSheetTab,
        label: string,
    ): Promise<void> {
        console.log(`${label} Tab "${activeTab.tab_name}" — processing ${parsedRows.length} rows for ${sheetDate}`);

        const leadGroupUuid = activeTab.lead_group_uuid!;
        const campaignUuid = cfg.campaign_uuid;
        const tenantUuid = cfg.tenant_uuid;

        let saved = 0;
        let duplicates = 0;
        let failed = 0;

        for (const { row, sheetDate: sd, row_number } of parsedRows) {
            const status = await this.saveRowToDatabase(row, row_number, sd, leadGroupUuid, campaignUuid, tenantUuid, cfg, activeTab, label);
            if (status === 'saved') saved++;
            else if (status === 'duplicate') duplicates++;
            else failed++;
        }

        console.log(`${label} Tab "${activeTab.tab_name}" — saved ${saved}, dup ${duplicates}, failed ${failed} out of ${parsedRows.length} rows for ${sheetDate}`);
        // Update summary stats
        this.summary.totalInsertedInLeadManagement += saved;
        this.summary.totalInsertedInGoogleSheetLeads += saved;
        this.summary.totalDuplicates += duplicates;
        this.summary.totalFailed += failed;
        if (saved > 0) {
            await this.runPostInsertTasks(leadGroupUuid, campaignUuid, tenantUuid, cfg, label);
        }
    }

    // =========================================================================
    // PRIVATE — payload building (field-mapping driven, zero hardcoded columns)
    // =========================================================================

    private getValidFieldMappings(cfg: GoogleSheetConfig, useFallback = true): FieldMapping[] {
        let mappings: any[] = [];
        if (cfg?.field_mappings) {
            if (Array.isArray(cfg.field_mappings)) {
                mappings = cfg.field_mappings;
            } else if (typeof cfg.field_mappings === 'string') {
                try {
                    const parsed = JSON.parse(cfg.field_mappings);
                    if (Array.isArray(parsed)) {
                        mappings = parsed;
                    }
                } catch { }
            } else if (typeof cfg.field_mappings === 'object') {
                if (typeof (cfg.field_mappings as any).index !== 'undefined' && typeof (cfg.field_mappings as any).field !== 'undefined') {
                    mappings = [cfg.field_mappings];
                } else {
                    mappings = Object.values(cfg.field_mappings);
                }
            }
        }

        const filtered = mappings
            .filter((m) => {
                if (!m || typeof m !== 'object') return false;
                const fieldValid = typeof m.field === 'string' && m.field.trim().length > 0;
                const indexValid = typeof m.index === 'number' || (m.index !== null && m.index !== undefined && !isNaN(Number(m.index)));
                return fieldValid && indexValid;
            })
            .map((m) => ({
                index: typeof m.index === 'number' ? m.index : parseInt(m.index, 10),
                field: String(m.field).trim(),
                type: m.type,
            }));

        if (filtered.length === 0 && useFallback) {
            if (!this.failedConfigs.has(cfg?.uuid + '_fallback')) {
                this.failedConfigs.add(cfg?.uuid + '_fallback');
                console.log(`[GoogleSheetService][Config: ${cfg?.uuid}] Empty or missing field mappings. Falling back to default sheet structure mappings.`);
            }
            return DEFAULT_FIELD_MAPPINGS;
        }

        return filtered;
    }

    private buildDynamicMappings(headers: string[], label: string): FieldMapping[] {
        const mappings: FieldMapping[] = [];
        for (let i = 0; i < headers.length; i++) {
            const originalHeader = headers[i] || '';
            const cleanHeader = originalHeader
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '');
            if (!cleanHeader) continue;
            let matched = false;
            for (const [field, config] of Object.entries(FIELD_ALIASES)) {
                const matchedAlias = config.aliases.some(alias => {
                    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                    // Exact match first, then partial — prevents 'phone' matching 'phonenumber' incorrectly
                    return cleanHeader === cleanAlias;
                });
                if (matchedAlias) {
                    mappings.push({ index: i, field, type: config.type });
                    matched = true;
                    break;
                }
            }
            // Second pass: partial includes match (only if exact match not found)
            if (!matched) {
                for (const [field, config] of Object.entries(FIELD_ALIASES)) {
                    const matchedAlias = config.aliases.some(alias => {
                        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return cleanHeader.includes(cleanAlias);
                    });
                    if (matchedAlias) {
                        mappings.push({ index: i, field, type: config.type });
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                // Fallback: use the cleaned header as the field name
                mappings.push({ index: i, field: cleanHeader, type: 'string' });
            }
        }
        console.log(`${label} Built dynamic mappings from headers:`, JSON.stringify(mappings));
        return mappings;
    }

    private buildPayload(row: any[], cfg: GoogleSheetConfig, overrides: Record<string, any>): any {
        const toDate = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
        const toNumber = (v: any) => {
            if (v == null || v === '') return null;
            const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
            return isNaN(n) ? null : n;
        };
        const toPhone = (v: any) => v ? String(v).replace(/^(\+91|91)/, '').trim() : null;

        const payload: any = { ...overrides };

        const validMappings = this.getValidFieldMappings(cfg);

        for (const mapping of validMappings) {
            const raw = row[mapping.index];
            const type = mapping.type ?? 'string';
            let value: any;

            switch (type) {
                case 'date': value = toDate(raw); break;
                case 'number': value = toNumber(raw); break;
                case 'phone': value = toPhone(raw); break;
                default: value = raw ?? null;
            }

            payload[mapping.field] = value;

            // Side-effects for well-known semantic fields
            if (mapping.field === 'name') {
                const parts = (raw || '').trim().split(/\s+/);
                payload.first_name = parts[0] || null;
                payload.last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
            }
            if (mapping.field === 'phone' || mapping.field === 'phone_number' || mapping.field === 'phonenumber' || mapping.field.toLowerCase().replace(/[^a-z0-9]/g, '') === 'phonenumber') {
                payload.phone_number = value;
                payload.custom_phone_number = value;
            }
        }

        return payload;
    }

    private async saveRowToDatabase(
        row: any[],
        row_number: number,
        sheetDate: string,
        leadGroupUuid: string,
        campaignUuid: string,
        tenantUuid: string,
        cfg: GoogleSheetConfig,
        activeTab: GoogleSheetTab,
        label: string
    ): Promise<'saved' | 'duplicate' | 'failed'> {
        try {
            // Check mappings first to prevent repeated row-level failures
            const validMappings = this.getValidFieldMappings(cfg);
            if (validMappings.length === 0) {
                if (!this.failedConfigs.has(cfg.uuid)) {
                    this.failedConfigs.add(cfg.uuid);
                    console.error(`[GoogleSheetService][Config: ${cfg.uuid}] Empty or invalid field mappings. Skipping row processing to prevent repeated row-level failures.`);
                }
                return 'failed';
            }

            const tokenColIdx = cfg.token_column_index ?? 2;
            const orderPlacedColIdx = cfg.order_placed_column_index ?? 9;
            const orderCreatedAtColIdx = cfg.order_created_at_column_index ?? 12;

            const token = row[tokenColIdx];

            // Skip-row condition (orderPlaced / orderCreatedAt)
            const orderPlace = (row[orderPlacedColIdx] || '').toString().trim();
            const orderTimeRaw = row[orderCreatedAtColIdx] ? new Date(row[orderCreatedAtColIdx]) : null;
            const orderTimeStr = orderTimeRaw && !isNaN(orderTimeRaw.getTime()) ? this.toDateStr(orderTimeRaw) : null;

            if (orderPlace === 'Yes' || orderTimeStr === sheetDate) {
                return 'failed';
            }

            const baseFields: Record<string, any> = {
                sheetDate,
                phone_code: '',
                lead_group_uuid: leadGroupUuid,
                tenant_uuid: tenantUuid,
                campaign_uuid: campaignUuid,
                lead_status: cfg.lead_status,
                lead_source: "GoogleSheet",
                google_sheet_uuid: cfg.uuid,
                sheet_tab_gid: activeTab.sheet_gid,
                sheet_tab_name: activeTab.tab_name,
                postal_code: null,
                email: null,
                user_uuid: null,
                gender: null,
                description: null,
                call_count: 0,
                in_dnc: '1',
                retries_count: 0,
                custom_fields: {},
                role: 'tenant',
                created_flag: '0',
                status: 'new',
                token,
            };

            // Ensure token exists – generate a UUID if missing
            const finalToken = token || randomUUID();
            // Build payload with guaranteed token
            const payload = this.buildPayload(row, cfg, { ...baseFields, token: finalToken });
            // Set lead_management_uuid if not generated by payload build
            if (!payload.lead_management_uuid) {
                payload.lead_management_uuid = randomUUID();
            }

            // ── Duplicate check: skip if same lead_group_uuid + phone_number already exists ──
            const phoneNumber = payload.phone_number ?? null;
            if (phoneNumber) {
                const existingLead = await this.lead_management.findOne({
                    lead_group_uuid: leadGroupUuid,
                    phone_number: phoneNumber,
                }).lean();
                if (existingLead) {
                    console.log(
                        `${label} Duplicate skipped — lead_group_uuid=${leadGroupUuid}, phone_number=${phoneNumber} already exists in lead_management.`,
                    );
                    return 'duplicate';
                }
            }

            // Insert into lead_management
            await this.lead_management.create([payload]);

            // Insert into google_sheet
            await this.googleSheetModel.create([{
                tenant_uuid: tenantUuid,
                config_uuid: cfg.uuid,
                spreadsheet_id: cfg.sheet_id,
                sheet_gid: activeTab.sheet_gid,
                tab_name: activeTab.tab_name,
                row_number: row_number,
                crm_lead_id: payload.lead_management_uuid,
                phone_number: payload.phone_number,
                google_sheet_status: "Imported",
                lead_status: "New",
                token: finalToken
            }]);

            // Insert into leads_in_queue directly using the same lead data
            await this.leads_in_queue.create([{
                lead_group_uuid: leadGroupUuid,
                campaign_uuid: campaignUuid,
                tenant_uuid: tenantUuid,
                lead_management_uuid: payload.lead_management_uuid,
                lead_sent: '1',
                campaign_flag: cfg.campaign_flag ?? 'blended',
            }]);
            console.log(`${label} Inserted into leads_in_queue: lead_management_uuid=${payload.lead_management_uuid}, lead_group_uuid=${leadGroupUuid}`);

            return 'saved';
        } catch (err: any) {
            console.error(`[GoogleSheetService][Config: ${cfg.uuid}] Error saving row:`, err?.message ?? err);
            if (err?.errors) console.error(`[GoogleSheetService][Config: ${cfg.uuid}] Validation errors:`, JSON.stringify(err.errors));

            // If it is a critical config error, re-throw to break the loop
            if (err?.message?.includes('Empty or invalid field mappings')) {
                throw err;
            }
            return 'failed';
        }
    }

    // =========================================================================
    // PRIVATE — post-insert tasks
    // =========================================================================

    private async runPostInsertTasks(
        leadGroupUuid: string,
        campaignUuid: string,
        tenantUuid: string,
        cfg: GoogleSheetConfig,
        label: string,
    ): Promise<void> {
        try {
            const campaignModel = (cfg.campaign_flag ?? 'blended') === 'blended'
                ? this.blended_campaign
                : this.outbound_campaign;

            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, campaignModel, leadGroupUuid, campaignUuid);
            await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, leadGroupUuid);

            const resetDto: ResetLeadDto = {
                lead_group_uuid: leadGroupUuid,
                campaign_uuid: campaignUuid,
                tenant_uuid: tenantUuid,
                disposition_uuid: cfg.lead_status,
            };

            if ((cfg.campaign_flag ?? 'blended') === 'blended') {
                await this.blendedCampaignService.googleSheetLeadsReset(resetDto);
            } else {
                await this.outboundCampaignService.googleSheetLeadsReset(resetDto);
            }

            console.log(`${label} Post-insert tasks completed.`);
        } catch (err: any) {
            console.error(`${label} Post-insert tasks failed:`, err?.message ?? err);
        }
    }

    // =========================================================================
    // PRIVATE — Google Sheet write-back (mark dispositioned leads as "Done")
    // =========================================================================

    private columnIndexToLetter(index: number): string {
        let letter = '';
        let n = index;
        while (n >= 0) {
            letter = String.fromCharCode(65 + (n % 26)) + letter;
            n = Math.floor(n / 26) - 1;
        }
        return letter;
    }

    private findStatusColumnIndex(headers: string[]): number {
        for (let i = 0; i < headers.length; i++) {
            const clean = (headers[i] || '').toLowerCase().replace(/[^a-z]/g, '');
            if (clean === 'status' || clean === 'callingstatus') return i;
        }
        return -1;
    }

    /**
     * Fetches the active tab's rows, finds leads whose lead_status has changed
     * from the initial cfg.lead_status (i.e. they have been dispositioned/called),
     * and writes "Done" back to the corresponding Status column in the Google Sheet.
     * Rows already showing "Done" are skipped.
     */
    private async syncLeadStatusToSheet(
        cfg: GoogleSheetConfig,
        activeTab: GoogleSheetTab,
        credential: GoogleCredential,
        label: string,
    ): Promise<void> {
        if (!activeTab.lead_group_uuid) return;

        try {
            // Build range that includes headers at row 1
            const startRowMatch = cfg.range_without_tab.match(/^([A-Za-z]+)(\d+)/);
            const rangeForHeaders = (startRowMatch && parseInt(startRowMatch[2], 10) > 1)
                ? cfg.range_without_tab.replace(/^([A-Za-z]+)\d+/, '$11')
                : cfg.range_without_tab;

            const range = `${activeTab.tab_name}!${rangeForHeaders}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheet_id}/values/${encodeURIComponent(range)}`;
            const allRows = await this.fetchSheetDataWithRetry(url, cfg, credential, label);

            if (!allRows || allRows.length < 2) return;

            const headers = allRows[0];
            const dataRows = allRows.slice(1);

            const statusColIndex = this.findStatusColumnIndex(headers);
            if (statusColIndex === -1) {
                console.log(`${label} No "Status" column found in tab "${activeTab.tab_name}" — skipping write-back.`);
                return;
            }

            const tokenColIdx = cfg.token_column_index ?? 2;

            // Collect tokens from rows not yet marked "Done"
            const pendingRows: { token: string; rowIndex: number }[] = [];
            for (let i = 0; i < dataRows.length; i++) {
                const currentStatus = (dataRows[i][statusColIndex] || '').toString().trim();
                if (currentStatus === 'Done') continue;
                const token = dataRows[i][tokenColIdx];
                if (token) pendingRows.push({ token: String(token), rowIndex: i });
            }

            if (!pendingRows.length) return;

            // Single batch DB query — find which tokens are now dispositioned
            const dispositionedLeads = await this.lead_management.find({
                token: { $in: pendingRows.map(r => r.token) },
                lead_group_uuid: activeTab.lead_group_uuid,
                lead_status: { $ne: cfg.lead_status },
            }).lean().select('token');

            const dispositionedSet = new Set(dispositionedLeads.map((l: any) => l.token));

            // dataRows[i] is sheet row i+2 (row 1 = headers, row 2 = first data row)
            const updates = pendingRows
                .filter(r => dispositionedSet.has(r.token))
                .map(r => ({
                    range: `${activeTab.tab_name}!${this.columnIndexToLetter(statusColIndex)}${r.rowIndex + 2}`,
                    values: [['Done']],
                }));

            if (!updates.length) {
                console.log(`${label} No newly dispositioned leads to write back.`);
                return;
            }

            await this.batchUpdateSheetCells(cfg, credential, updates, label);
            console.log(`${label} Marked ${updates.length} lead(s) as "Done" in sheet tab "${activeTab.tab_name}".`);

        } catch (err: any) {
            console.error(`${label} syncLeadStatusToSheet failed:`, err?.message ?? err);
        }
    }

    private async batchUpdateSheetCells(
        cfg: GoogleSheetConfig,
        credential: GoogleCredential,
        updates: { range: string; values: any[][] }[],
        label: string,
    ): Promise<void> {
        const jwtClient = this.buildJwtClient(credential);
        const token = await jwtClient.authorize();
        if (!token?.access_token) throw new Error('No access token for sheet write');

        await axios.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheet_id}/values:batchUpdate`,
            { valueInputOption: 'RAW', data: updates },
            {
                headers: { Authorization: `Bearer ${token.access_token}` },
                timeout: cfg.timeout_ms ?? 30_000,
            },
        );
    }

    // =========================================================================
    // PRIVATE — new-tab detection & auto-reset
    // =========================================================================

    /**
     * Runs at the start of every cron tick.
     * For each config that is currently marked all_tabs_exhausted = true, fetches
     * the live tab list from Google Sheets and syncs metadata.  If any brand-new
     * tab is discovered (status = 'pending'), the config is automatically reset so
     * the main processing loop picks it up in the same cron run.
     */
    private async checkExhaustedConfigsForNewTabs(): Promise<void> {
        const exhaustedConfigs = await this.googleConfigModel
            .find({ isActive: true, all_tabs_exhausted: true })
            .lean<GoogleSheetConfig[]>();

        if (!exhaustedConfigs.length) return;

        for (const cfg of exhaustedConfigs) {
            const label = `[GoogleSheetService][${cfg.tenant_uuid}][${cfg.sheet_id}]`;
            try {
                const credential = await this.googleCredentialModel
                    .findOne({ uuid: cfg.credential_uuid })
                    .lean<GoogleCredential>();
                if (!credential) continue;

                // Sync live tabs — new tabs are inserted with status 'pending'
                const liveTabs = await this.fetchTabList(cfg, credential, label);
                if (!liveTabs) continue;

                await this.syncTabMetadata(cfg, liveTabs, label);

                // Count tabs that are genuinely new (never processed before)
                const pendingCount = await this.googleSheetTabModel.countDocuments({
                    config_uuid: cfg.uuid,
                    status: 'pending',
                });

                if (pendingCount === 0) {
                    console.log(`${label} No new tabs found — config remains exhausted.`);
                    continue;
                }

                // New tabs found — reset the config exactly as the manual query does
                await this.googleConfigModel.updateOne(
                    { uuid: cfg.uuid },
                    {
                        $set: { all_tabs_exhausted: false, active_tab_gid: null, isActive: true },
                        $unset: { exhaustion_email_sent_at: '' },
                    },
                );

                console.log(`${label} ${pendingCount} new tab(s) detected — config auto-reset for reprocessing.`);
            } catch (err: any) {
                console.error(`${label} checkExhaustedConfigsForNewTabs error:`, err?.message ?? err);
            }
        }
    }

    // =========================================================================
    // PRIVATE — per-config exhaustion sync
    // =========================================================================

    /**
     * Called after the last pending tab is consumed for a given config.
     *
     * Verifies that EVERY tab under this config has status = 'exhausted'.
     * Only when that is true does it write:
     *   google_sheet_config.all_tabs_exhausted = true
     *   google_sheet_config.isActive           = false
     *
     * If even one tab is still pending or active the config is left unchanged.
     */
    private async checkConfigExhaustion(configUuid: string, label: string): Promise<void> {
        try {
            const totalTabs = await this.googleSheetTabModel.countDocuments({ config_uuid: configUuid });

            if (totalTabs === 0) {
                console.log(`${label} No tabs found for config — skipping exhaustion check.`);
                return;
            }

            const exhaustedTabs = await this.googleSheetTabModel.countDocuments({
                config_uuid: configUuid,
                status: 'exhausted',
            });

            console.log(`${label} Exhaustion check — total tabs: ${totalTabs}, exhausted tabs: ${exhaustedTabs}`);

            if (exhaustedTabs < totalTabs) {
                console.log(`${label} Not all tabs are exhausted yet (${exhaustedTabs}/${totalTabs}) — config remains active.`);
                return;
            }

            // All tabs are exhausted — update the config
            console.log(`${label} All ${totalTabs} tab(s) exhausted — marking google_sheet_config as all_tabs_exhausted and isActive=false.`);
            await this.googleConfigModel.updateOne(
                { uuid: configUuid },
                { $set: { all_tabs_exhausted: true, isActive: false } },
            );
            console.log(`${label} google_sheet_config updated: all_tabs_exhausted=true, isActive=false.`);
        } catch (err: any) {
            console.error(`${label} checkConfigExhaustion error:`, err?.message ?? err);
        }
    }

    // =========================================================================
    // PRIVATE — global exhaustion check & email
    // =========================================================================

    /**
     * Called once after all configs are processed each cron run.
     *
     * Condition to send the email:
     *   ALL active configs have all_tabs_exhausted = true
     *   AND no email has been sent yet (exhaustion_email_sent_at is null).
     *
     * Recipients are collected across all configs (deduped by email address).
     */
    private async checkGlobalExhaustion(): Promise<void> {
        console.log('[GoogleSheetService] -> checkGlobalExhaustion() started. Searching for exhausted configs...');

        // Find configs that are exhausted but haven't had an email sent yet
        const query = {
            all_tabs_exhausted: true,
            $or: [
                { exhaustion_email_sent_at: null },
                { exhaustion_email_sent_at: "null" },
                { exhaustion_email_sent_at: "" },
                { exhaustion_email_sent_at: { $exists: false } }
            ]
        };
        console.log('[GoogleSheetService] query:', JSON.stringify(query));

        const exhaustedConfigs = await this.googleConfigModel.find(query).lean<GoogleSheetConfig[]>();
        console.log('[GoogleSheetService] Exhausted configs:', exhaustedConfigs);
        console.log(`[GoogleSheetService] Found ${exhaustedConfigs.length} exhausted configs needing emails.`);

        if (!exhaustedConfigs.length) return;

        // Group exhausted configs by campaign
        const campaignConfigsMap = new Map<string, GoogleSheetConfig[]>();
        for (const cfg of exhaustedConfigs) {
            const key = cfg.campaign_uuid || 'no_campaign';
            if (!campaignConfigsMap.has(key)) {
                campaignConfigsMap.set(key, []);
            }
            campaignConfigsMap.get(key)!.push(cfg);
        }

        for (const [campaignUuid, configs] of campaignConfigsMap.entries()) {
            if (campaignUuid !== 'no_campaign') {
                // Check if this campaign has any active unexhausted configs
                const unexhaustedCount = await this.googleConfigModel.countDocuments({
                    campaign_uuid: campaignUuid,
                    all_tabs_exhausted: false,
                    isActive: true
                });

                if (unexhaustedCount > 0) {
                    console.log(`[GoogleSheetService] Campaign ${campaignUuid} still has ${unexhaustedCount} unexhausted sheets. Delaying campaign exhaustion email.`);
                    continue; // Skip sending email until ALL sheets are exhausted
                }
            }

            console.log(`[GoogleSheetService] All sheets for campaign ${campaignUuid} are exhausted. Processing notification email.`);

            // Collect all unique recipients for the campaign
            const allRecipientsMap = new Map<string, NotificationRecipient>();
            for (const cfg of configs) {
                if (cfg.notification_recipients) {
                    for (const r of cfg.notification_recipients) {
                        allRecipientsMap.set(r.email, r);
                    }
                }
            }
            const recipients = Array.from(allRecipientsMap.values());

            // Use the first config for email context (campaign, tenant) but pass all configs for the summary
            const baseCfg = configs[0];
            const success = await this.sendExhaustionEmail(recipients, baseCfg, configs);

            if (success) {
                // Mark all these configs as email-sent
                const configUuids = configs.map(c => c.uuid);
                await this.googleConfigModel.updateMany(
                    { uuid: { $in: configUuids } },
                    { $set: { exhaustion_email_sent_at: new Date().toISOString() } }
                );
            }
        }
    }

    /**
     * Finds individual tabs that have status = 'exhausted' but have not had
     * their exhaustion email sent yet, and triggers the email notification.
     */
    private async checkTabExhaustion(): Promise<void> {
        console.log('[GoogleSheetService] -> checkTabExhaustion() started. Searching for exhausted tabs...');

        const query = {
            status: 'exhausted',
            $or: [
                { exhaustion_email_sent_at: null },
                { exhaustion_email_sent_at: "null" },
                { exhaustion_email_sent_at: "" },
                { exhaustion_email_sent_at: { $exists: false } }
            ]
        };

        const exhaustedTabs = await this.googleSheetTabModel.find(query).lean<GoogleSheetTab[]>();
        console.log(`[GoogleSheetService] Found ${exhaustedTabs.length} exhausted tabs needing emails.`);

        if (!exhaustedTabs.length) return;

        for (const tab of exhaustedTabs) {
            console.log(`[GoogleSheetService] Tab "${tab.tab_name}" (gid: ${tab.sheet_gid}) is exhausted. Processing notification email.`);

            const cfg = await this.googleConfigModel.findOne({ uuid: tab.config_uuid }).lean<GoogleSheetConfig>();
            if (!cfg) {
                console.warn(`[GoogleSheetService] No config found for tab ${tab.tab_name} (gid ${tab.sheet_gid}). Skipping email.`);
                continue;
            }

            // If all tabs in the config are exhausted, do NOT send individual tab email (the global email will be sent instead)
            if (cfg.all_tabs_exhausted) {
                console.log(`[GoogleSheetService] Config ${cfg.uuid} has all tabs exhausted. Skipping individual email for tab "${tab.tab_name}" to avoid duplicate notifications.`);
                await this.googleSheetTabModel.updateOne(
                    { _id: (tab as any)._id },
                    { $set: { exhaustion_email_sent_at: new Date().toISOString() } }
                );
                continue;
            }

            const recipients = cfg.notification_recipients ?? [];
            const success = await this.sendTabExhaustionEmail(recipients, cfg, tab);

            if (success) {
                // Mark this tab as email-sent
                await this.googleSheetTabModel.updateOne(
                    { _id: (tab as any)._id },
                    { $set: { exhaustion_email_sent_at: new Date().toISOString() } }
                );
                console.log(`[GoogleSheetService] Tab "${tab.tab_name}" marked as exhaustion email sent.`);
            }
        }
    }

    private async sendTabExhaustionEmail(recipients: NotificationRecipient[], cfg: GoogleSheetConfig, tab: GoogleSheetTab): Promise<boolean> {
        try {
            // Find Campaign to get email_config_uuid
            let emailConfigUuid = null;

            // Check outbound collection first
            let campaign = await this.outbound_campaign.findOne({ uuid: cfg.campaign_uuid }).lean();

            if (campaign) {
                emailConfigUuid = (campaign as any).email_config_uuid;
            } else {
                // If not found in outbound, check blended collection
                campaign = await this.blended_campaign.findOne({ uuid: cfg.campaign_uuid }).lean();
                if (campaign) {
                    emailConfigUuid = (campaign as any).email_config_uuid;
                }
            }

            let mailConfig = null;
            if (emailConfigUuid) {
                mailConfig = await this.googleConfigModel.db.collection('mail_configuration').findOne({ uuid: emailConfigUuid });
            }

            if (!mailConfig) {
                console.warn(`[GoogleSheetService] No valid mail_configuration found for campaign ${cfg.campaign_uuid}. Skipping tab exhaustion email.`);
                return false;
            }

            const toListEmails = [];
            if (recipients && recipients.length) {
                toListEmails.push(...recipients.map(r => `"${r.name}" <${r.email}>`));
            }
            if (mailConfig.to && Array.isArray(mailConfig.to) && mailConfig.to.length) {
                toListEmails.push(...mailConfig.to);
            }

            const toList = toListEmails.join(', ');

            if (!toList) {
                console.warn(`[GoogleSheetService] No recipients found for tab config ${cfg.uuid}. Skipping email.`);
                return false;
            }
            console.log(`[GoogleSheetService] Sending tab exhaustion email using mailConfig:`, mailConfig);

            // Decrypt the password stored in the database
            let decodedPassword = mailConfig.password;
            if (mailConfig.password) {
                try {
                    const decipher = createDecipheriv(process.env.ALGORITHM, process.env.ENCRYPTION_KEY, process.env.PASSWORD_LENGTH);
                    decodedPassword = decipher.update(mailConfig.password, "hex", "utf-8");
                    decodedPassword += decipher.final("utf8");
                } catch (err: any) {
                    console.warn(`[GoogleSheetService] Failed to decrypt email password, trying raw string...`);
                }
            }

            const smtpConfig = {
                host: mailConfig.host,
                port: Number(mailConfig.port),
                secure: Number(mailConfig.port) === 465,
                auth: {
                    user: mailConfig.username,
                    pass: decodedPassword,
                },
                tls: {
                    rejectUnauthorized: false
                }
            };

            const fromEmail = mailConfig.from;
            const transporter = nodemailer.createTransport(smtpConfig);

            // Fetch template body if it exists
            let customTemplateBody = null;
            if (mailConfig.template_ids && mailConfig.template_ids.length > 0) {
                const templateUuid = mailConfig.template_ids[0];
                const msgConfig = await this.googleConfigModel.db.collection('email_template').findOne({ uuid: templateUuid });
                if (msgConfig && msgConfig.body) {
                    customTemplateBody = msgConfig.body;
                }
            }

            // Fetch tenant name
            const tenant = await this.googleConfigModel.db.collection('tenant').findOne({ uuid: cfg.tenant_uuid });
            const tenantName = tenant?.tenant_name || 'sampann';

            // Build a single tab summary table
            const tableHtml = `
            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead style="background:#2c3e50;color:#fff">
                <tr>
                <th>Tenant Name</th>
                <th>Sheet ID</th>
                <th>Tab Name (Lead Group)</th>
                <th>Total Leads Imported</th>
                <th>Exhausted At</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                <td>${tenantName}</td>
                <td>${cfg.sheet_id}</td>
                <td>${tab.tab_name}</td>
                <td>${tab.total_leads}</td>
                <td>${tab.exhausted_at
                    ? tab.exhausted_at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
            </tbody>
            </table>
            `;

            const subject = `[Dialler Alert] Google Sheet Tab "${tab.tab_name}" has been exhausted`;
            let htmlBody = '';

            if (customTemplateBody) {
                if (customTemplateBody.includes('[TABLE]')) {
                    htmlBody = customTemplateBody.replace('[TABLE]', tableHtml);
                } else {
                    htmlBody = customTemplateBody + '<br><br>' + tableHtml;
                }
            } else {
                htmlBody = `
                <html><body style="font-family:Arial,sans-serif;color:#333">
                <h2 style="color:#c0392b">Tab Exhaustion Notification</h2>
                <p>A tab in your Google Sheet integration has been fully churned.
                No callable leads remain in this tab.</p>

                ${tableHtml}

                <p style="margin-top:20px;color:#555">
                The dialler will proceed to the next pending tab if available.
                </p>
                <p style="font-size:12px;color:#aaa">
                This is an automated message from the Dialler system.<br/>
                Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </p>
                </body></html>`;
            }

            await transporter.sendMail({
                from: fromEmail,
                to: toList,
                subject,
                html: htmlBody,
            });

            console.log(`[GoogleSheetService] Tab exhaustion email sent to: ${toList}`);
            return true;
        } catch (err: any) {
            console.error('[GoogleSheetService] Failed to send tab exhaustion email:', err?.message ?? err);
            return false;
        }
    }

    /**
     * Sends a plain-text + HTML email via nodemailer using SMTP env vars.
     *
     * Required env vars:
     *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
     */
    private async sendExhaustionEmail(recipients: NotificationRecipient[], cfg: GoogleSheetConfig, campaignConfigs: GoogleSheetConfig[]): Promise<boolean> {
        try {
            console.log(cfg, "challallaa", cfg.uuid, cfg.campaign_uuid, cfg.campaign_flag);

            // Find Campaign to get email_config_uuid
            let emailConfigUuid = null;

            // Check outbound collection first
            let campaign = await this.outbound_campaign.findOne({ uuid: cfg.campaign_uuid }).lean();

            if (campaign) {
                emailConfigUuid = (campaign as any).email_config_uuid;
            } else {
                // If not found in outbound, check blended collection
                campaign = await this.blended_campaign.findOne({ uuid: cfg.campaign_uuid }).lean();
                if (campaign) {
                    emailConfigUuid = (campaign as any).email_config_uuid;
                }
            }

            let mailConfig = null;
            if (emailConfigUuid) {
                mailConfig = await this.googleConfigModel.db.collection('mail_configuration').findOne({ uuid: emailConfigUuid });
            }

            if (!mailConfig) {
                console.warn(`[GoogleSheetService] No valid mail_configuration found for campaign ${cfg.campaign_uuid}. Skipping exhaustion email.`);
                return false;
            }

            const toListEmails = [];
            if (recipients && recipients.length) {
                toListEmails.push(...recipients.map(r => `"${r.name}" <${r.email}>`));
            }
            if (mailConfig.to && Array.isArray(mailConfig.to) && mailConfig.to.length) {
                toListEmails.push(...mailConfig.to);
            }

            const toList = toListEmails.join(', ');

            if (!toList) {
                console.warn(`[GoogleSheetService] No recipients found for config ${cfg.uuid}. Skipping email.`);
                return false;
            }
            console.log(`[GoogleSheetService] Sending mailConfig:`, mailConfig);

            // Decrypt the password stored in the database
            let decodedPassword = mailConfig.password;
            if (mailConfig.password) {
                try {
                    const decipher = createDecipheriv(process.env.ALGORITHM, process.env.ENCRYPTION_KEY, process.env.PASSWORD_LENGTH);
                    decodedPassword = decipher.update(mailConfig.password, "hex", "utf-8");
                    decodedPassword += decipher.final("utf8");
                } catch (err: any) {
                    console.warn(`[GoogleSheetService] Failed to decrypt email password, trying raw string...`);
                }
            }
            console.log(decodedPassword, "[GoogleSheetService] decodedPassword");

            const smtpConfig = {
                host: mailConfig.host,
                port: Number(mailConfig.port),
                secure: Number(mailConfig.port) === 465,
                auth: {
                    user: mailConfig.username,
                    pass: decodedPassword,
                },
                tls: {
                    rejectUnauthorized: false
                }
            };

            const fromEmail = mailConfig.from;

            const transporter = nodemailer.createTransport(smtpConfig);

            // Fetch template body if it exists
            let customTemplateBody = null;
            if (mailConfig.template_ids && mailConfig.template_ids.length > 0) {
                const templateUuid = mailConfig.template_ids[0];
                const msgConfig = await this.googleConfigModel.db.collection('email_template').findOne({ uuid: templateUuid });
                if (msgConfig && msgConfig.body) {
                    customTemplateBody = msgConfig.body;
                }
            }

            // Build a per-config summary table using all campaign configs
            const tabSummaryRows = await this.buildExhaustionSummary(campaignConfigs);

            const tableHtml = `
            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead style="background:#2c3e50;color:#fff">
                <tr>
                <th>Tenant Name</th>
                <th>Sheet ID</th>
                <th>Tab Name (Lead Group)</th>
                <th>Total Leads Imported</th>
                <th>Exhausted At</th>
                </tr>
            </thead>
            <tbody>
                ${tabSummaryRows.map(r => `
                <tr>
                <td>${r.tenantName}</td>
                <td>${r.sheetId}</td>
                <td>${r.tabName}</td>
                <td>${r.totalLeads}</td>
                <td>${r.exhaustedAt}</td>
                </tr>`).join('')}
            </tbody>
            </table>
            `;

            const subject = `[Dialler Alert] Google Sheet leads have been exhausted`;
            let htmlBody = '';

            if (customTemplateBody) {
                // If user put [TABLE] placeholder, replace it. Otherwise append to the bottom.
                if (customTemplateBody.includes('[TABLE]')) {
                    htmlBody = customTemplateBody.replace('[TABLE]', tableHtml);
                } else {
                    htmlBody = customTemplateBody + '<br><br>' + tableHtml;
                }
            } else {
                // Fallback to default hardcoded template
                htmlBody = `
                <html><body style="font-family:Arial,sans-serif;color:#333">
                <h2 style="color:#c0392b">Lead Exhaustion Notification</h2>
                <p>All leads in a Google Sheet integration have been fully churned.
                No callable leads remain in any tab of this sheet.</p>

                ${tableHtml}

                <p style="margin-top:20px;color:#555">
                Please upload new lead data or add new tabs to the sheet to resume dialling.
                </p>
                <p style="font-size:12px;color:#aaa">
                This is an automated message from the Dialler system.<br/>
                Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </p>
                </body></html>`;
            }

            await transporter.sendMail({
                from: fromEmail,
                to: toList,
                subject,
                html: htmlBody,
            });

            console.log(`[GoogleSheetService] Exhaustion email sent to: ${toList}`);
            return true;
        } catch (err: any) {
            console.error('[GoogleSheetService] Failed to send exhaustion email:', err?.message ?? err);
            return false;
        }
    }

    private async buildExhaustionSummary(configs: GoogleSheetConfig[]): Promise<{ tenantName: string; sheetId: string; tabName: string; totalLeads: number; exhaustedAt: string }[]> {
        const rows: { tenantName: string; sheetId: string; tabName: string; totalLeads: number; exhaustedAt: string }[] = [];

        for (const cfg of configs) {
            const tenant = await this.googleConfigModel.db.collection('tenant').findOne({ uuid: cfg.tenant_uuid });
            const tenantName = tenant?.tenant_name || 'sampann';

            const tabs = await this.googleSheetTabModel
                .find({ config_uuid: cfg.uuid })
                .sort({ position: 1 })
                .lean<GoogleSheetTab[]>();

            for (const tab of tabs) {
                rows.push({
                    tenantName,
                    sheetId: cfg.sheet_id,
                    tabName: tab.tab_name,
                    totalLeads: tab.total_leads,
                    exhaustedAt: tab.exhausted_at
                        ? tab.exhausted_at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : '—',
                });
            }
        }

        return rows;
    }

    // =========================================================================
    // PRIVATE — HTTP fetch with retry
    // =========================================================================

    private async fetchSheetDataWithRetry(url: string, cfg: GoogleSheetConfig, credential: GoogleCredential, label: string): Promise<any[] | null> {
        const timeoutMs = cfg.timeout_ms ?? 30_000;
        const maxRetries = cfg.max_retries ?? 3;
        const jwtClient = this.buildJwtClient(credential);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`${label} Fetch attempt ${attempt}/${maxRetries}: ${url}`);
                const token = await jwtClient.authorize();
                if (!token?.access_token) throw new Error('No access token');

                const res = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token.access_token}` },
                    timeout: timeoutMs,
                });

                return res.data?.values ?? [];
            } catch (err: any) {
                const { shouldBreak, shouldRetry } = this.classifyFetchError(err, attempt, maxRetries, label);
                if (shouldBreak) break;
                if (shouldRetry) {
                    const backoff = Math.pow(2, attempt - 1) * 1_000;
                    console.log(`${label} Retrying in ${backoff}ms…`);
                    await this.sleep(backoff);
                }
            }
        }

        return null;
    }

    private classifyFetchError(err: any, attempt: number, maxRetries: number, label: string): { shouldBreak: boolean; shouldRetry: boolean } {
        const isLast = attempt === maxRetries;
        const msg = err?.message ?? err;

        if (err.code === 'ECONNABORTED' || msg?.includes('timeout')) {
            console.warn(`${label} Timeout on attempt ${attempt}`);
            return { shouldBreak: false, shouldRetry: !isLast };
        }

        if (err.response?.data) {
            const status = err.response.status;
            console.error(`${label} API error ${status}`, JSON.stringify(err.response.data));
            if (status >= 400 && status < 500 && status !== 429) {
                return { shouldBreak: true, shouldRetry: false };
            }
            return { shouldBreak: false, shouldRetry: !isLast };
        }

        console.error(`${label} Error on attempt ${attempt}:`, msg);
        return { shouldBreak: isLast, shouldRetry: !isLast };
    }

    // =========================================================================
    // PRIVATE — date utilities
    // =========================================================================

    private toDateStr(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private parseSheetDate(value: any): Date | null {
        if (value == null) return null;
        if (typeof value === 'number') {
            return new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86_400_000));
        }
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
        const p = Date.parse(value);
        return isNaN(p) ? null : new Date(p);
    }

    private getAllowedDates(label: string): Set<string> {
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const mins = nowIST.getHours() * 60 + nowIST.getMinutes();
        const inWork = mins >= 540 && mins < 1140;   // 09:00–19:00 IST

        const todayStr = this.toDateStr(nowIST);
        const yest = new Date(nowIST); yest.setDate(nowIST.getDate() - 1);
        const yestStr = this.toDateStr(yest);

        const allowed = inWork ? new Set([todayStr]) : new Set([yestStr, todayStr]);
        console.log(`${label} IST ${nowIST.getHours()}:${String(nowIST.getMinutes()).padStart(2, '0')} | workHours=${inWork} | allowed=${[...allowed].join(', ')}`);
        return allowed;
    }

    private bucketRowsByDate(rows: any[], dateColIdx: number, allowedDates: Set<string>, label: string): Map<string, { row: any[]; sheetDate: string }[]> {
        const buckets = new Map<string, { row: any[]; sheetDate: string }[]>();

        for (const row of rows) {
            const raw = row?.[dateColIdx];
            if (!raw) continue;
            const parsed = this.parseSheetDate(raw);
            if (!parsed) continue;
            const sd = this.toDateStr(parsed);
            if (!allowedDates.has(sd)) continue;

            if (!buckets.has(sd)) buckets.set(sd, []);
            buckets.get(sd)!.push({ row, sheetDate: sd });
        }

        const info = [...buckets.entries()].map(([d, r]) => `${d}(${r.length})`).join(', ') || 'none';
        console.log(`${label} Date buckets: ${info}`);
        return buckets;
    }

    // =========================================================================
    // PRIVATE — credential helpers
    // =========================================================================

    private async getActiveCredential(): Promise<GoogleCredential> {
        const c = await this.googleCredentialModel.findOne({ isActive: true });
        if (!c) throw new Error('No active Google credentials found');
        return c;
    }

    /**
     * Normalises a private key string that may have been stored in MongoDB in
     * various broken formats:
     *  - Literal `\n` (two chars) instead of real newlines
     *  - Double-escaped `\\n` (three chars)
     *  - Windows `\r\n` line endings
     *  - Missing PEM headers (rare but possible)
     */
    private normalizePrivateKey(raw: string): string {
        let key = raw
            .replace(/\\\\n/g, '\n')   // triple-escaped \\n → newline (must be first)
            .replace(/\\n/g, '\n')      // single-escaped \n  → newline
            .replace(/\r\n/g, '\n')     // Windows CRLF       → newline
            .replace(/\r/g, '\n')       // bare CR            → newline
            .trim();

        // If PEM headers are missing, wrap the key so OpenSSL can parse it
        if (!key.includes('-----BEGIN')) {
            key = `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
        }

        return key;
    }

    private buildJwtClient(credential: GoogleCredential): JWT {
        // credential.scopes can be stored as a comma-separated string OR as an
        // array of strings depending on how the credential was saved.  Handle both.
        let scopesArray: string[];
        if (Array.isArray(credential.scopes)) {
            scopesArray = credential.scopes as unknown as string[];
        } else if (typeof credential.scopes === 'string' && (credential.scopes as string).length > 0) {
            scopesArray = (credential.scopes as string).split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
            // Fallback: grant full Sheets + Drive read access
            scopesArray = [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.readonly',
            ];
            console.warn(`[buildJwtClient] credential ${credential.uuid} has no scopes — using default spreadsheets + drive.readonly scopes.`);
        }

        const normalizedKey = this.normalizePrivateKey(credential.private_key);

        try {
            return new JWT({
                email: credential.client_email,
                key: normalizedKey,
                scopes: scopesArray,
            });
        } catch (err: any) {
            // Give a clear, actionable error instead of a cryptic OpenSSL message
            console.error(
                `[buildJwtClient] ❌ Failed to build JWT for credential_uuid=${credential.uuid}.\n` +
                `  Email : ${credential.client_email}\n` +
                `  Error : ${err?.message ?? err}\n` +
                `  ► ACTION REQUIRED: The private_key stored in MongoDB for this credential is corrupted or\n` +
                `    in an unsupported format.  Fix steps:\n` +
                `    1. Go to Google Cloud Console → IAM & Admin → Service Accounts\n` +
                `    2. Find account: ${credential.client_email}\n` +
                `    3. Keys tab → Add Key → Create new key → JSON\n` +
                `    4. Copy the new "private_key" value into MongoDB:\n` +
                `       db.google_credentials.updateOne(\n` +
                `         { uuid: "${credential.uuid}" },\n` +
                `         { $set: { private_key: "<paste new key here>" } }\n` +
                `       )`,
            );
            throw err;
        }
    }
}