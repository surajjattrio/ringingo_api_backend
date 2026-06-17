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
    name:                  { type: 'string', aliases: ['name', 'fullname', 'customername', 'clientname'] },
    phone:                 { type: 'phone',  aliases: ['phone', 'mobile', 'contact', 'contactnumber'] },
    amount:                { type: 'number', aliases: ['amount', 'price', 'totalamount', 'orderamount', 'totalprice', 'sellingprice'] },
    shopifyCustomerId:     { type: 'string', aliases: ['shopifycustomerid', 'customerid'] },
    product1:              { type: 'string', aliases: ['product', 'productname', 'product1', 'item', 'itemname'] },
    address:               { type: 'string', aliases: ['address', 'customeraddress', 'shippingaddress', 'billingaddress', 'location'] },
    date:                  { type: 'date',   aliases: ['date', 'orderdate', 'dateplaced'] },
    time:                  { type: 'string', aliases: ['time', 'ordertime'] },
    orderPlaced:           { type: 'string', aliases: ['orderplaced', 'placed'] },
    orderId:               { type: 'string', aliases: ['orderid', 'id', 'ordernumber'] },
    orderName:             { type: 'string', aliases: ['ordername'] },
    orderCreatedAt:        { type: 'date',   aliases: ['ordercreatedat', 'createdat'] },
    mobileNumber:          { type: 'string', aliases: ['mobilenumber'] },
    count:                 { type: 'number', aliases: ['count', 'quantity', 'qty'] },
    callingDate:           { type: 'date',   aliases: ['callingdate'] },
    agentName:             { type: 'string', aliases: ['agentname', 'agent'] },
    finalConnected:        { type: 'string', aliases: ['finalconnected', 'connected'] },
    finalSellingPrice:     { type: 'number', aliases: ['finalsellingprice'] },
    finalMOP:              { type: 'number', aliases: ['finalmop', 'mop'] },
    finalOrderPlaced:      { type: 'string', aliases: ['finalorderplaced'] },
    callingStatus:         { type: 'string', aliases: ['callingstatus', 'status'] },
    finalRemark:           { type: 'string', aliases: ['finalremark', 'remark', 'remarks'] },
    extraRemarks:          { type: 'string', aliases: ['extraremarks', 'notes'] },
    orderDate:             { type: 'date',   aliases: ['orderdate'] },
    month:                 { type: 'string', aliases: ['month'] },
    churnCount:            { type: 'number', aliases: ['churncount', 'churn'] },
    lastCallDate:          { type: 'date',   aliases: ['lastcalldate'] },
    countType:             { type: 'string', aliases: ['counttype'] },
    orderedMonth:          { type: 'string', aliases: ['orderedmonth'] },
    leadsMonth:            { type: 'string', aliases: ['leadsmonth'] },
    orderStatus:           { type: 'string', aliases: ['orderstatus'] },

    // ── CRM-style headers → exact DB field name keys ──────────────────────
    // These keys match MongoDB field names directly, so payload[field] = value
    // writes to the correct field without any extra side-effects.
    first_name:              { type: 'string', aliases: ['firstname', 'first name', 'first_name'] },
    last_name:               { type: 'string', aliases: ['lastname', 'last name', 'last_name'] },
    phone_number:            { type: 'phone',  aliases: ['phonenumber', 'phone number', 'phone_number', 'phoneno', 'phone no'] },
    alternate_phone_number:  { type: 'phone',  aliases: ['alternatephonenumber', 'alternate phone number', 'alternate_phone_number', 'altphone', 'alternatephone', 'alt phone', 'alt phone number'] },
    postal_code:             { type: 'string', aliases: ['postalcode', 'postal code', 'postal_code', 'zip', 'zipcode', 'pincode', 'pin code'] },
    dob:                     { type: 'string', aliases: ['dateofbirth', 'date of birth', 'dob', 'date_of_birth', 'birthdate'] },
    email:                   { type: 'string', aliases: ['email', 'emailaddress', 'email address', 'email_address'] },
    city:                    { type: 'string', aliases: ['city'] },
    state:                   { type: 'string', aliases: ['state'] },
    province:                { type: 'string', aliases: ['province'] },
    gender:                  { type: 'string', aliases: ['gender', 'sex'] },
    description:             { type: 'string', aliases: ['description', 'desc'] },
    campaign_name:           { type: 'string', aliases: ['campaignname', 'campaign name', 'campaign_name'] },
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

        const configs = await this.googleConfigModel
            .find({ all_tabs_exhausted: false })
            .lean<GoogleSheetConfig[]>();
        if (!configs.length) {
            console.log('[GoogleSheetService] No active sheet configs to process.');
            return this.summary;
        }
        console.log(`[GoogleSheetService] Total Google Sheets found: ${configs.length}`);
        this.summary.totalSheets = configs.length;
        // Process each config in parallel using Promise.allSettled to ensure one config's failure does not stop others
        const configPromises = configs.map(async (cfg) => {
            if (!cfg.isActive) {
                console.log(`[GoogleSheetService] Skipping inactive config UUID: ${cfg.uuid}`);
                return; // skip inactive
            }
            console.log(`[GoogleSheetService] Processing active Google Sheet config UUID: ${cfg.uuid}`);
            await this.processConfig(cfg);
        });
        await Promise.allSettled(configPromises);

        // Log final summary
        // Recompute total tabs from DB to ensure accurate count
        this.summary.totalTabs = await this.googleSheetTabModel.countDocuments({});
        console.log('[GoogleSheetService] Processing complete. Summary:', this.summary);
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
            console.log(`${label} Total tabs found: ${liveTabs.length}`);
            // Update summary
            this.summary.totalTabs += liveTabs.length;
            await this.syncTabMetadata(cfg, liveTabs, label);

            // ── Step 2: Check if active tab is exhausted → promote ────────
            await this.advanceActiveTabIfExhausted(cfg, label);

            // ── Step 3: Re-fetch config after mutations ───────────────────
            const freshCfg = await this.googleConfigModel.findOne({ uuid: cfg.uuid }).lean<GoogleSheetConfig>();
            if (!freshCfg || freshCfg.all_tabs_exhausted) {
                console.log(`${label} All tabs exhausted — skipping import.`);
                return;
            }

            if (freshCfg.active_tab_gid == null) {
                console.log(`${label} No active tab yet — nothing to import.`);
                return;
            }

            // ── Step 4: Import leads for the active tab ───────────────────
            const activeTab = await this.googleSheetTabModel
                .findOne({ config_uuid: cfg.uuid, sheet_gid: freshCfg.active_tab_gid })
                .lean<GoogleSheetTab>();

            if (!activeTab) {
                console.error(`${label} Active tab doc not found for gid ${freshCfg.active_tab_gid}`);
                return;
            }

            // Only import if tab has not been imported yet (total_leads = 0 means first time)
            if (!activeTab.total_leads || activeTab.total_leads === 0) {
                await this.importTabLeads(freshCfg, activeTab, credential, label);
            } else {
                console.log(`${label} Tab "${activeTab.tab_name}" already imported (${activeTab.total_leads} leads) — skipping re-import.`);
            }
            // Sync dispositioned leads back to Google Sheet (writes "Done" to Status column)
            await this.syncLeadStatusToSheet(freshCfg, activeTab, credential, label);
            // Re‑evaluate tab exhaustion so we can move to the next tab when all leads are called
            await this.advanceActiveTabIfExhausted(freshCfg, label);

        } catch (err: any) {
            console.error(`${label} Unhandled error:`, err?.message ?? err);
        }
    }

    // =========================================================================
    // PRIVATE — tab discovery & sync
    // =========================================================================

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
            console.error(`${label} Failed to fetch tab list:`, err?.message ?? err);
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

        console.log(`${label} Tab metadata synced.`);
    }
    // =========================================================================
    // PRIVATE — tab advancement logic
    // =========================================================================

    /**
     * Core state-machine:
     *
     *  1. If no active tab → activate the first pending tab (leftmost).
     *  2. If active tab exists → check if it's exhausted.
     *     - Exhausted → mark it, find the next pending tab, activate it.
     *     - Next pending tab not found → mark config as all_tabs_exhausted.
     */
    private async advanceActiveTabIfExhausted(cfg: GoogleSheetConfig, label: string): Promise<void> {

        // ── Case A: No active tab yet → activate leftmost pending ─────────
        if (cfg.active_tab_gid == null) {
            await this.activateNextPendingTab(cfg, null, label);
            return;
        }

        // ── Case B: Active tab exists → check exhaustion ──────────────────
        const activeTab = await this.googleSheetTabModel
            .findOne({ config_uuid: cfg.uuid, sheet_gid: cfg.active_tab_gid })
            .lean<GoogleSheetTab>();

        if (!activeTab) {
            console.warn(`${label} Active tab gid ${cfg.active_tab_gid} not found in DB — resetting.`);
            await this.googleConfigModel.updateOne({ uuid: cfg.uuid }, { active_tab_gid: null });
            return;
        }

        const isExhausted = await this.isTabExhausted(activeTab, cfg, label);

        if (!isExhausted) {
            console.log(`${label} Tab "${activeTab.tab_name}" still has callable leads — continuing.`);
            return;
        }

        // Mark current tab exhausted
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
     * A lead is "callable" if its lead_status equals the config's lead_status value
     * AND it belongs to the tab's lead group.
     *
     * Adjust the query to match your exact "new / callable" lead definition.
     */
    private async isTabExhausted(tab: GoogleSheetTab, cfg: GoogleSheetConfig, label: string): Promise<boolean> {
        if (!tab.lead_group_uuid) {
            // Tab was never imported — not exhausted, just empty
            return false;
        }

        if (tab.remaining_leads === 0) {
            console.log(`${label} Tab "${tab.tab_name}" has 0 remaining leads based on DB counter.`);
            return true;
        }

        // Always count actual callable leads — never rely on remaining_leads counter
        // (remaining_leads can be 0 right after import before any lead is called)
        const remaining = await this.lead_management.countDocuments({
            lead_group_uuid: tab.lead_group_uuid,
            lead_status: cfg.lead_status,
        });

        console.log(`${label} Tab "${tab.tab_name}" remaining callable leads: ${remaining}`);

        // Update snapshot for observability
        await this.googleSheetTabModel.updateOne(
            { _id: (tab as any)._id },
            { remaining_leads: remaining },
        );

        return remaining === 0;
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

            // Duplicate Prevention check
            const existingSheetLead = await this.googleSheetModel.findOne({
                config_uuid: cfg.uuid,
                sheet_gid: activeTab.sheet_gid,
                row_number: row_number
            });

            if (existingSheetLead) {
                console.log(`${label} Duplicate row found: config_uuid=${cfg.uuid}, sheet_gid=${activeTab.sheet_gid}, row_number=${row_number}`);
                return 'duplicate';
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
            exhaustion_email_sent_at: { $in: [null, "null", ""] }
        };
        console.log('[GoogleSheetService] query:', JSON.stringify(query));

        const exhaustedConfigs = await this.googleConfigModel.find(query).lean<GoogleSheetConfig[]>();
        console.log('[GoogleSheetService] Exhausted configs:', exhaustedConfigs);
        console.log(`[GoogleSheetService] Found ${exhaustedConfigs.length} exhausted configs needing emails.`);

        if (!exhaustedConfigs.length) return;

        for (const cfg of exhaustedConfigs) {
            console.log(`[GoogleSheetService] All tabs for config ${cfg.uuid} (Sheet: ${cfg.sheet_id}) are exhausted. Processing notification email.`);

            const recipients = cfg.notification_recipients ?? [];
            const success = await this.sendExhaustionEmail(recipients, cfg);

            if (success) {
                // Mark this config as email-sent
                await this.googleConfigModel.updateOne(
                    { uuid: cfg.uuid },
                    { exhaustion_email_sent_at: new Date().toISOString() }
                );
            }
        }
    }

    /**
     * Sends a plain-text + HTML email via nodemailer using SMTP env vars.
     *
     * Required env vars:
     *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
     */
    private async sendExhaustionEmail(recipients: NotificationRecipient[], cfg: GoogleSheetConfig): Promise<boolean> {
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

            // Build a per-config summary table
            const tabSummaryRows = await this.buildExhaustionSummary([cfg]);

            const tableHtml = `
            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead style="background:#2c3e50;color:#fff">
                <tr>
                <th>Sheet ID</th>
                <th>Tab Name (Lead Group)</th>
                <th>Total Leads Imported</th>
                <th>Exhausted At</th>
                </tr>
            </thead>
            <tbody>
                ${tabSummaryRows.map(r => `
                <tr>
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

    private async buildExhaustionSummary(configs: GoogleSheetConfig[]): Promise<{ sheetId: string; tabName: string; totalLeads: number; exhaustedAt: string }[]> {
        const rows: { sheetId: string; tabName: string; totalLeads: number; exhaustedAt: string }[] = [];

        for (const cfg of configs) {
            const tabs = await this.googleSheetTabModel
                .find({ config_uuid: cfg.uuid })
                .sort({ position: 1 })
                .lean<GoogleSheetTab[]>();

            for (const tab of tabs) {
                rows.push({
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

    private buildJwtClient(credential: GoogleCredential): JWT {
        return new JWT({
            email: credential.client_email,
            key: credential.private_key.replaceAll(String.raw`\n`, '\n'),
            scopes: credential.scopes.split(','),
        });
    }
}