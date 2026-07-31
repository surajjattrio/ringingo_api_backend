import { Injectable } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { GoogleSheet, GoogleSheetDocument } from 'src/modules/google-sheet/schema/google-sheet.schema';
import { LeadManagementDocument, LeadManagementSchema } from 'src/modules/lead-management/schema/lead-management.schema';
import { LeadManagementService } from "src/modules/lead-management/services/lead-management.service";
import { LeadGroupDocument, LeadGroupSchema } from 'src/modules/lead-group/schema/lead-group.schema';
import { OutboundCampaignDocument, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { BlendedCampaignDocument, BlendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';
import { OutboundCampaignService } from 'src/modules/campaigns/outbound-campaign/services/outbound-campaign.service';
import { GoogleCredential, GoogleCredentialDocument } from '../schema/google-credential.schema';
import { GoogleSheetConfig, GoogleSheetConfigDocument } from '../schema/google-sheet-config.schema';
import { CreateGoogleCredentialDto } from '../dto/google-credential.dto';
import { BlendedCampaignService } from 'src/modules/campaigns/blended-campaign/services/blended-campaign.service';
import { ResetLeadDto } from 'src/modules/campaigns/outbound-campaign/dto/reset-lead.dto';

@Injectable()
export class GoogleSheetService {
    private readonly jwtClient: JWT;
    private sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
        private readonly blendedCampaignService: BlendedCampaignService
    ) {
        this.jwtClient = new JWT({
            email: process.env.GOOGLE_SHEET_CLIENT_EMAIL,
            key: process.env.GOOGLE_SHEET_PRIVATE_KEY?.replaceAll(String.raw`\n`, '\n'),
            scopes: [process.env.GOOGLE_SHEET_SCOPES],
        });
    }

    async callGoogleSheetCron() { await this.createLeadGroup(); await this.fetchSheetData(); }

    /** Save service account credentials */
    async createCredential(dto: CreateGoogleCredentialDto) {
        let logMessages = { logErrorMsg: "Google Credential already exist \n", logSuccessMsg: "Google Credential created successfully \n" }
        const credential = await this.commonDbFn.findAndInsert(this.googleCredentialModel, { tenant_uuid: dto.tenant_uuid }, dto, JSON.stringify(logMessages));
        return credential;
    }

    /** Fetch active credential */
    private async getActiveCredential(): Promise<GoogleCredential> {
        const credential = await this.googleCredentialModel.findOne({ isActive: true });
        if (!credential) { throw new Error('No active Google credentials found in DB'); }
        return credential;
    }

    /** Create JWT client dynamically */
    private createJwtClient(credential: GoogleCredential): JWT {
        return new JWT({
            email: credential.client_email,
            key: credential.private_key.replaceAll(String.raw`\n`, '\n'),
            scopes: credential.scopes.split(','),
        });
    }

    /** Generate access token from DB credentials */
    async generateAccessToken() {
        const credential = await this.getActiveCredential();    // 1️⃣ Fetch credentials from DB
        const jwtClient = this.createJwtClient(credential);     // 2️⃣ Create JWT client
        const token = await jwtClient.authorize();      // 3️⃣ Authorize

        if (!token?.access_token) {
            console.error('[GoogleOauthService]: Failed to obtain access token', token);
            throw new Error('No access token received from Google');
        }

        await this.googleCredentialModel.updateOne(
            { tenant_uuid: credential.tenant_uuid },
            {
                access_token: token.access_token,
                refresh_token: token.refresh_token || null,
                token_expiry: token.expiry_date ? new Date(token.expiry_date) : null,
            },
            { upsert: true }
        );

        return {
            statusCode: 200,
            message: "Token generated/updated successfully",
            accessToken: token.access_token,
            tokenExpiry: token.expiry_date ? new Date(token.expiry_date) : null,
        };
    }

    async listGoogleSheets() {
        const credential = await this.getActiveCredential();    // 1️⃣ Fetch credentials from DB
        const jwtClient = this.createJwtClient(credential);     // 2️⃣ Create JWT client
        const token = await jwtClient.authorize();      // 3️⃣ Authorize

        if (!token?.access_token) { throw new Error('Failed to authorize with Google Sheets'); }

        const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${credential.sheet_id}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
        const sheets = response.data.sheets || [];

        // 5️⃣ Extract sheet name + total rows
        const formattedSheets = sheets.map((sheet: any) => ({
            sheetId: sheet.properties.sheetId,
            name: sheet.properties.title,
            totalRows: sheet.properties.gridProperties?.rowCount || 0,
            totalColumns: sheet.properties.gridProperties?.columnCount || 0,
            hidden: sheet.properties.hidden || false,
        }));

        return {
            spreadsheetId: response.data.spreadsheetId,
            spreadsheetTitle: response.data.properties?.title,
            totalSheets: formattedSheets.length,
            sheets: formattedSheets,
        };
    }

    async createLeadGroup(dateStr?: string): Promise<any> {
        // If no date supplied, fall back to today (keeps callGoogleSheetCron() working)
        if (!dateStr) {
            const today = new Date();
            dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }

        const groupName = `GoogleSheet-${dateStr}`;
        const existing = await this.lead_group.findOne({ name: groupName });

        if (existing) {
            console.log(`[GoogleSheetService] LeadGroup "${groupName}" already exists, reusing.`);
            return existing;
        }

        const googleConfig = await this.googleConfigModel.findOne({ tenant_uuid: "408a40ac-0a27-43c3-b2bd-e03aa203f046" });
        const LeadGroupDtoWithDefaults = {
            name: groupName,
            description: groupName,
            status: "0",
            user_group_uuid: googleConfig.user_group_uuid,
            campaign_uuid: googleConfig.campaign_uuid,
            tenant_uuid: googleConfig.tenant_uuid,
            role: "tenant",
            human_answer: 0,
            sale: 0,
            totalLeadCount: 0,
            campaign_flag: "blended"
        };

        console.log('[GoogleSheetService] Lead Group created successfully');
        return this.lead_group.create(LeadGroupDtoWithDefaults);
    }

    private async saveRowToDatabase(row: any[], sheetDate: string, leadGroupUuid: string, campaignUuid: string, tenantUuid: string, processedPhonesInGroup?: Set<string>): Promise<boolean> {
        try {
            const toDate = (v: any) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
            const toNumber = (v: any) => {
                if (v == null || v === '') return null;
                const n = Number(String(v).replaceAll(/[^0-9.-]+/g, ''));
                return Number.isNaN(n) ? null : n;
            };

            const token = row[2];
            // Clean primary phone number (row[1]) or fall back to mobile number (row[13])
            const phone_number = row[1]?.replace(/^(\+91|91)/, '').trim() || row[13] || null;

            // Check for duplicates
            // if (token) {
            //     // const [leadExists, sheetExists] = await Promise.all([
            //     //     this.lead_management.findOne({ token }).lean(),
            //     //     this.googleSheetModel.findOne({ token }).lean(),
            //     // ]);

            //     // if (leadExists || sheetExists) {
            //     //     console.log('[GoogleSheetService] Skipping duplicate records:', token);
            //     //     return false;
            //     // }

            //     const leadExists = await this.lead_management.findOne({ token }).lean();

            //     if (leadExists) {
            //         console.log('[GoogleSheetService] Skipping duplicate records:', token);
            //         return false;
            //     }
            // }

            // Prevent duplicate records within the same Lead Group (same Date & Phone combination)
            if (phone_number) {
                // 1. In-batch duplicate check for current Lead Group
                if (processedPhonesInGroup?.has(phone_number)) {
                    console.log(`[GoogleSheetService] Duplicate skipped (in-batch) — lead_group_uuid=${leadGroupUuid}, phone_number=${phone_number}`);
                    return false;
                }

                // 2. Database duplicate check for current Lead Group
                const leadExists = await this.lead_management.findOne({ 
                    lead_group_uuid: leadGroupUuid,
                    campaign_uuid: campaignUuid,
                    tenant_uuid: tenantUuid,
                    phone_number
                }).lean();

                if (leadExists) {
                    console.log(`[GoogleSheetService] Duplicate skipped — lead_group_uuid=${leadGroupUuid}, phone_number=${phone_number} already exists in lead_management.`);
                    return false;
                }
            }

            const orderPlace = (row[9] || '').toString().trim(); // Column J
            const orderTimeRaw = row[12] ? new Date(row[12]) : null; // Column M

            // ✅ Compare orderCreatedAt against the ROW'S OWN date (sheetDate)
            // NOT today's cron run date
            let orderTimeStr: string | null = null;
            if (orderTimeRaw && !Number.isNaN(orderTimeRaw.getTime())) {
                orderTimeStr = `${orderTimeRaw.getFullYear()}-${String(orderTimeRaw.getMonth() + 1).padStart(2, '0')}-${String(orderTimeRaw.getDate()).padStart(2, '0')}`;
            }

            // ✅ Compare against sheetDate, not todayStr
            // Validation based on Column J: If "Yes", corresponding Phone Number should not be uploaded into Lead Group
            if (orderPlace === 'Yes' || orderPlace.toLowerCase() === 'yes' || orderTimeStr === sheetDate) {
                console.log('[GoogleSheetService] Skipped due to orderPlace/orderTime condition', { phone_number, orderPlace, orderTimeStr, sheetDate });
                return false;
            }

            const fullName = (row[0] || '').trim();
            const parts = fullName.split(/\s+/);
            const first_name = parts[0] || null;
            const last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
            const phoneNumber = row[1]?.replace(/^(\+91|91)/, '').trim() || null;
            const googleConfig = await this.googleConfigModel.findOne({ tenant_uuid: "408a40ac-0a27-43c3-b2bd-e03aa203f046" });

            const payload: any = {
                row,
                sheetDate,

                first_name,
                last_name,
                phone_code: "",
                phone_number: phoneNumber || null,
                lead_group_uuid: leadGroupUuid,
                tenant_uuid: tenantUuid,
                campaign_uuid: campaignUuid,
                lead_status: googleConfig.lead_status,
                postal_code: null,
                email: null,
                user_uuid: null,
                gender: null,
                description: null,
                custom_phone_number: phoneNumber || null,
                call_count: 0,
                in_dnc: "1",
                retries_count: 0,
                custom_fields: {},
                role: "tenant",
                created_flag: "0",

                name: row[0] || null,
                phone: phoneNumber || null,
                amount: toNumber(row[3]),
                shopifyCustomerId: row[4] || null,
                product1: row[5] || null,
                address: row[6] || null,
                date: toDate(row[7]),
                time: row[8] || null,
                orderPlaced: row[9] || null,
                orderId: row[10] || null,
                orderName: row[11] || null,
                orderCreatedAt: toDate(row[12]),
                mobileNumber: row[13] || null,
                count: toNumber(row[14]),
                callingDate: toDate(row[15]),
                agentName: row[16] || null,
                finalConnected: row[17] || null,
                finalSellingPrice: toNumber(row[18]),
                finalMOP: toNumber(row[19]),
                finalOrderPlaced: row[20] || null,
                callingStatus: row[21] || null,
                finalRemark: row[22] || null,
                extraRemarks: row[23] || null,
                orderDate: toDate(row[24]),
                month: row[25] || null,
                churnCount: toNumber(row[26]),
                lastCallDate: toDate(row[27]),
                countType: row[28] || null,
                orderedMonth: row[29] || null,
                leadsMonth: row[30] || null,
                orderStatus: row[31] || null,
                status: 'new',
                token,
            };

            // await this.googleSheetModel.create(payload);
            await this.leadManagementService.createNewLeadWithoutReset(payload);

            // Record inserted phone number in-memory for current Lead Group batch duplicate prevention
            if (phone_number && processedPhonesInGroup) {
                processedPhonesInGroup.add(phone_number);
            }

            return true;
        } catch (err: any) {
            console.error('[GoogleSheetService] Error saving to MongoDB:', err?.message || err);
            if (err?.errors) {
                console.error('[GoogleSheetService] Validation errors:', JSON.stringify(err.errors));
            }
            return false;
        }
    }

    private parseSheetDate(value: any): Date | null {
        if (value == null) return null;
        // Numeric serial date (Google/Excel) -> convert to JS Date
        if (typeof value === 'number') {
            const excelEpochMs = Date.UTC(1899, 11, 30);
            const ms = Math.round(value * 86400000);
            return new Date(excelEpochMs + ms);
        }

        // Try Date constructor
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d;

        // Try parse as fallback
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return new Date(parsed);

        return null;
    }

    private getAllowedDates(): Set<string> {
        // 1. Get current IST time
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const istHour = nowIST.getHours();   // 0-23
        const istMinute = nowIST.getMinutes();
        const istTimeInMinutes = istHour * 60 + istMinute; // e.g. 9:00 AM = 540, 7:00 PM = 1140
        const WORK_START = 9 * 60;   // 9:00 AM = 540 mins
        const WORK_END = 19 * 60;  // 7:00 PM = 1140 mins
        const isWithinWorkingHours = istTimeInMinutes >= WORK_START && istTimeInMinutes < WORK_END;

        // 2. Build allowed date set based on working hours
        const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
        const yesterdayIST = new Date(todayIST); yesterdayIST.setDate(todayIST.getDate() - 1);
        const yesterdayStr = `${yesterdayIST.getFullYear()}-${String(yesterdayIST.getMonth() + 1).padStart(2, '0')}-${String(yesterdayIST.getDate()).padStart(2, '0')}`;

        // Within working hours → only today
        // Outside working hours → yesterday + today (client uploading previous day's after-7PM data)
        const allowedDates = isWithinWorkingHours ? new Set([todayStr]) : new Set([yesterdayStr, todayStr]);

        console.log(`[GoogleSheetService] IST time: ${istHour}:${String(istMinute).padStart(2, '0')} | Working hours: ${isWithinWorkingHours} | Allowed dates: ${[...allowedDates].join(', ')}`);

        return allowedDates;
    }

    private bucketRowsByDate(rows: any[], dateColumnIndex: number, allowedDates: Set<string>): Map<string, any[]> {
        // 3. Bucket rows by row[7] date — only allowed dates
        type ParsedRow = { row: any[]; sheetDate: string };
        const buckets = new Map<string, ParsedRow[]>();

        for (const row of rows) {
            const raw = row?.[dateColumnIndex]; // row[7]
            if (!raw) continue;

            const parsed = this.parseSheetDate(raw);
            if (!parsed) continue;

            const sheetDate: string = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;

            // ✅ Only process allowed dates — skip everything else
            if (!allowedDates.has(sheetDate)) continue;

            if (!buckets.has(sheetDate)) buckets.set(sheetDate, []);
            buckets.get(sheetDate).push({ row, sheetDate });
        }

        const bucketInfo = [...buckets.entries()].map(([d, r]) => `${d}(${r.length} rows)`).join(', ') || 'none';
        console.log(`[GoogleSheetService] Buckets: ${bucketInfo}`);

        return buckets;
    }

    // 4. Process each bucket → its own lead group
    private async processBucket(sheetDate: string, parsedRows: any[]): Promise<void> {
        console.log(`[GoogleSheetService] Processing ${parsedRows.length} rows for ${sheetDate}`);

        const leadGroup = await this.createLeadGroup(sheetDate);
        const leadGroupUuid = leadGroup.uuid.toString();
        const campaignUuid = leadGroup.campaign_uuid.toString();
        const tenantUuid = leadGroup.tenant_uuid.toString();

        // In-memory set to track uploaded phone numbers for the current Lead Group batch
        const processedPhonesInGroup = new Set<string>();

        let saved = 0;
        for (const { row, sheetDate: sd } of parsedRows) {
            const ok = await this.saveRowToDatabase(row, sd, leadGroupUuid, campaignUuid, tenantUuid, processedPhonesInGroup);
            if (ok) saved++;
        }

        console.log(`[GoogleSheetService] Saved ${saved} / ${parsedRows.length} rows for ${sheetDate}`);
        await this.runPostInsertTasks(leadGroupUuid, campaignUuid, tenantUuid);
    }

    private async processFilteredRows(rows: any[], dateColumnIndex: number): Promise<any[]> {
        const allowedDates = this.getAllowedDates();
        const buckets = this.bucketRowsByDate(rows, dateColumnIndex, allowedDates);

        for (const [sheetDate, parsedRows] of buckets) {
            await this.processBucket(sheetDate, parsedRows);
        }

        return rows;
    }

    /** Called ONCE after all leads are inserted */
    private async runPostInsertTasks(leadGroupUuid: string, campaignUuid: string, tenantUuid: string): Promise<void> {
        try {
            const googleConfig = await this.googleConfigModel.findOne({ tenant_uuid: "408a40ac-0a27-43c3-b2bd-e03aa203f046" });

            // Update counts once
            // await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, leadGroupUuid, campaignUuid);
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, leadGroupUuid, campaignUuid);
            await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, leadGroupUuid);

            // Reset leads once
            const resetLeadDto: ResetLeadDto = {
                lead_group_uuid: leadGroupUuid,
                campaign_uuid: campaignUuid,
                tenant_uuid: tenantUuid,
                disposition_uuid: googleConfig.lead_status,
            };

            // await this.outboundCampaignService.googleSheetLeadsReset(resetLeadDto);
            await this.blendedCampaignService.googleSheetLeadsReset(resetLeadDto);

            console.log('[GoogleSheetService] Reset leads completed.');
        } catch (err: any) {
            console.error('[GoogleSheetService] Post-insert tasks failed:', err?.message || err);
        }
    }

    private handleFetchError(err: any, attempt: number, maxRetries: number): { shouldBreak: boolean; shouldRetry: boolean } {
        const isLast = attempt === maxRetries;
        const errMsg = err?.message || err;

        if (err.code === 'ECONNABORTED' || errMsg?.includes('timeout')) {
            console.warn(`[GoogleSheetService]: timeout on attempt ${attempt} (${errMsg})`);
            return { shouldBreak: false, shouldRetry: !isLast };
        }

        if (err.response?.data) {
            console.error('[GoogleSheetService]: API error', JSON.stringify(err.response.data));
            const status = err.response.status;
            if (status >= 400 && status < 500 && status !== 429) {
                return { shouldBreak: true, shouldRetry: false };
            }
            return { shouldBreak: false, shouldRetry: !isLast };
        }

        console.error(`[GoogleSheetService]: Error on attempt ${attempt}`, errMsg);
        if (isLast) {
            console.error('[GoogleSheetService]: All retry attempts failed');
        }
        return { shouldBreak: isLast, shouldRetry: !isLast };
    }

    private async fetchSheetDataWithRetry(url: string, timeoutMs: number, maxRetries: number): Promise<any[] | null> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[GoogleSheetService]: attempt ${attempt} to fetch sheet data`);

                const token = await this.jwtClient.authorize();
                if (!token?.access_token) {
                    console.error('[GoogleSheetService]: Failed to obtain access token', token);
                    throw new Error('No access token');
                }

                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token.access_token}` },
                    timeout: timeoutMs,
                });

                return response.data?.values || [];
            } catch (err: any) {
                const { shouldBreak, shouldRetry } = this.handleFetchError(err, attempt, maxRetries);

                if (shouldBreak) break;
                if (shouldRetry) {
                    const backoff = Math.pow(2, attempt - 1) * 1000;
                    console.log(`[GoogleSheetService]: retrying in ${backoff}ms`);
                    await this.sleep(backoff);
                }
            }
        }

        return null;
    }

    async fetchSheetData(): Promise<any[]> {
        const spreadsheetId = process.env.GOOGLE_SHEET_SHEET_ID;
        const range = process.env.GOOGLE_SHEET_RANGE;

        if (!spreadsheetId || !range) {
            console.error('[GoogleSheetService]: Missing GOOGLE_SHEET_SHEET_ID or GOOGLE_SHEET_RANGE', { spreadsheetId, range });
            return [];
        }

        const timeoutMs = Number.parseInt(process.env.GOOGLE_SHEET_TIMEOUT_MS || '30000');
        const maxRetries = Number.parseInt(process.env.GOOGLE_SHEET_MAX_RETRIES || '3');
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

        const rows = await this.fetchSheetDataWithRetry(url, timeoutMs, maxRetries);
        if (!rows) return [];

        const filterToday = (process.env.GOOGLE_SHEET_FILTER_TODAY || 'true').toLowerCase() !== 'false';
        if (filterToday) {
            const dateColumnIndex = Number.parseInt(process.env.GOOGLE_SHEET_DATE_COLUMN_INDEX || '7', 10);
            return this.processFilteredRows(rows, dateColumnIndex);
        }

        return rows;
    }
}