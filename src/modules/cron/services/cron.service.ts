import { Injectable, Logger, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { PredictiveCalculationDocument, PredictiveCalculationSchema } from "src/modules/campaigns/inbound-campaign/schema/predictive-calculation.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { CdrsArchiveDocument, CdrsArchiveSchema } from "src/modules/cdrs/schema/cdrs-archive.schema";
import { CdrsArchiveService } from "src/modules/cdrs/services/cdrs-archive.service";

import { RecordingsDocument, RecordingsSchema } from "src/modules/recordings/schema/recordings.schema";
import { RecordingsService } from "src/modules/recordings/services/recordings.service";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";

import axios from 'axios';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { AgentCallCenterService } from "src/modules/call-center/services/agent-call-center.service";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { RequestSchedulerService } from "src/modules/request-scheduler/services/request-scheduler.service";
import { MailScheduleDocument, MailScheduleSchema } from "src/modules/mail-schedule/schema/mail-schedule.schema";
import { MailConfigurationDocument, MailConfigurationSchema } from "src/modules/mail-configuration/schema/mail-configuration.schema";
import { UserPerformanceReportService } from "src/modules/user-performance-report/services/user-performance-report.service";
import { CdrsService } from "src/modules/cdrs/services/cdrs.service";
import { LoginlogoutreportService } from "src/modules/login-logout-report/services/login-logout-report.service";
import { CallQueueReportService } from "src/modules/call-queue-report/services/call-queue-report.service";
import { MailService } from "src/modules/common/mail-service";
import { EmailTemplateDocument, EmailTemplateSchema } from "src/modules/email-template/schema/email-template.schema";
import * as moment from 'moment-timezone';

class MockResponse {
    private chunks: string[] = [];
    headers: Record<string, string> = {};
    headersSent = false;
    statusCode = 200;
    responseBody: any = null;
    writeCount = 0;

    setHeader(name: string, value: string) {
        this.headers[name] = value;
    }

    write(chunk: any) {
        this.headersSent = true;
        this.writeCount++;
        this.chunks.push(chunk.toString('utf-8'));
    }

    end() {
        this.headersSent = true;
    }

    status(code: number) {
        this.statusCode = code;
        return this;
    }

    json(body: any) {
        this.responseBody = body;
    }

    getCSVContent(): string {
        return this.chunks.join('');
    }
}

@Injectable()

export class CronService {
    constructor(
        @InjectModel(PredictiveCalculationSchema.name) private readonly predictive_calculation: Model<PredictiveCalculationDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(CdrsArchiveSchema.name) private readonly cdrs_archive: Model<CdrsArchiveDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        // @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        private readonly cdrsArchiveService: CdrsArchiveService,

        @InjectModel(RecordingsSchema.name) private readonly recordings: Model<RecordingsDocument>,
        private readonly recordingsService: RecordingsService,
        // private readonly call_center: AgentCallCenterService,
        @InjectModel(TenantSchema.name) private readonly tenants: Model<TenantDocument>,
        private readonly requestSchedulerService: RequestSchedulerService,
        @InjectModel(MailScheduleSchema.name) private readonly mailSchedule: Model<MailScheduleDocument>,
        @InjectModel(MailConfigurationSchema.name) private readonly mailConfiguration: Model<MailConfigurationDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(EmailTemplateSchema.name) private readonly emailTemplate: Model<EmailTemplateDocument>,
        private readonly userPerformanceReportService: UserPerformanceReportService,
        private readonly cdrsService: CdrsService,
        private readonly loginLogoutReportService: LoginlogoutreportService,
        private readonly callQueueReportService: CallQueueReportService,
        private readonly mailService: MailService
    ) { }

    /*
    @Usage               : Remove one hour older records from predictive calculation collection
    @Param  execute time : Every 1 hour
    @return Object       : Success / Error
    */

    @Cron(CronExpression.EVERY_HOUR, { name: "Remove data from predictive calculation every 1 hour" })
    async removeDataHourlyBase() {
        try {
            let currentISODateTime = new Date();
            let newDate: any = currentISODateTime.setHours(currentISODateTime.getHours() - 1);
            newDate = new Date(newDate).toISOString();
            let response = await this.predictive_calculation.deleteMany({ createdAt: { $lte: newDate } });
            if (response.deletedCount > 0) {
                Logger.debug(`Deleted 1 hour older records`);
            } else {
                Logger.debug(`Logger block ==== Unable to delete 1 hours older records`);
            }
        } catch (error) {
            Logger.error(`Catch block ==== Unable to delete 1 hours older records`, error.message);
        }
    }

    /*
    @Usage                  : CDRS archive at every quarter
    @Param  execute time    : Every day at night 1AM
    @return Object          : Success / Error
    */

    // @Cron( CronExpression.EVERY_10_SECONDS, { name: "CDRS archive at every 10 seconds" } )
    // @Cron( CronExpression.EVERY_MINUTE, { name: "CDRS archive at every 1 minute" } )
    @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: "CDRS archive at every night 1 AM" })
    // @Cron(CronExpression.EVERY_QUARTER,{ name : "CDRS archive at every quarter midnight" })
    async cdrsArchiveQuarterly() {
        try {
            this.cdrsArchiveService.quarterlyArchive();
        } catch (error) {
            Logger.error(`CDRS archive - Catch block ==> Unable to archive quarterly CDRS ==> `, error.message);
            //  Logger.error( `CDRS archive - Catch found ==> CDRS archive ==> `, error );
            throw new Error(`CDRS archive - Catch block ==> Unable to archive quarterly CDRS ==> ${error.message}`);
        }
    }

    /*
    @Usage                  : Upload tenant recordings on UP-CLOUD server using shell-script
    @Param  execute time    : Every day at night 2AM
    @return Object          : Success / Error
    */

    // @Cron( CronExpression.EVERY_MINUTE, { name: "CDRS archive at every 1 minute" } )
    // @Cron( CronExpression.EVERY_HOUR, { name: "CDRS archive at every 1 Hour" } )
    @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "Upload Tenant recordings at every night 2 AM" })
    async uploadTenantRecordings() {
        try {
            this.recordingsService.uploadTenantRecordings();

        } catch (error) {
            Logger.error(`Upload Tenant Recordings - Catch block ==> Unable to upload ==> `, error.message);
            //  Logger.error( `Upload Tenant Recordings - Catch block ==> Unable to upload ==> `, error );
            throw new Error(`Upload Tenant Recordings - Catch block ==> Unable to upload ==> ${error.message}`);
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES, { name: "Upload Cdrs Requested Data at Every 30 min" })
    async executeRequestSchedulerEvery30Mins() {
        const enabled = process.env.CRON_SETUP === 'false';
        if (enabled) return;
        // console.log('GoogleSheetCron is disabled via env variable');
        try {
            Logger.debug(`Request Scheduler Cron - Started`);
            await this.requestSchedulerService.processPendingRequests();
            Logger.debug(`Request Scheduler Cron - Finished`);
        } catch (error: any) {
            Logger.error(
                `Request Scheduler Cron - Catch block ==> Unable to process scheduler requests ==> `,
                error.message
            );
        }
    }




    /*@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        name: 'Agent logout at every midnight',
    })
    async agentLogout() {
        try {
            // Fetch all logged-in agents (adjust filter if needed)
            const users = await this.user
                .find({ is_logged_in: "0" }) // or remove filter if all agents
                .select('uuid')
                .lean();

            if (!users.length) {
                Logger.log('No agents found for midnight logout');
                return;
            }

            // Extract UUIDs
            const userIds: any = users.map(user => user.uuid);

            // Call bulk logout
            await this.call_center.bulkAgentLogout(userIds);

            Logger.log(`Midnight logout completed for ${userIds.length} agents`);
        } catch (error) {
            Logger.error(
                `Agent Midnight Logout Failed`,
                error.stack || error.message
            );
            throw error;
        }
    } */

    ///////////
    // @Cron(CronExpression.EVERY_MINUTE) // runs every 1 minute
    // async uploadLeadsFromSheet() {
    //     Logger.log('Cron Started: Fetching leads using CSV...');

    //     try {
    //         const sheetUrl = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/export?format=csv`;
    //         const response = await axios.get(sheetUrl);


    //         const rows = await this.parseCsv(response.data);

    //         console.log("sheeet response",rows);
    //         // for (const row of rows) {
    //         //     const { name, email, phone, city, status } = row;

    //         //     await this.lead_management.updateOne(
    //         //         { email }, // unique key for upsert
    //         //         { name, email, phone, city, status },
    //         //         { upsert: true }
    //         //     );
    //         // }

    //         // Logger.log(`Cron completed: ${rows.length} leads synced`);
    //     } catch (error) {
    //         Logger.error('Cron error:', error.message);
    //     }
    // }

    // private async parseCsv(csvText: string): Promise<any[]> {
    //     return new Promise((resolve, reject) => {
    //         const results: any[] = [];

    //         Readable.from(csvText)
    //             .pipe(csvParser())
    //             .on('data', (data) => results.push(data))
    //             .on('end', () => resolve(results))
    //             .on('error', (err) => reject(err));
    //     });
    // }

    private jsonToCsv(data: any[], reportType: string): string {
        if (!data || !data.length) return "";
        
        if (reportType === 'cdr') {
            const columns = [
                { header: "Start Date", key: "callstart" },
                { header: "End Date", key: "createdAt" },
                { header: "Caller ID Number / DID", key: "caller_id_number" },
                { header: "Phone Number", key: "destination_number" },
                { header: "User ID", key: "user_username" },
                { header: "Full Name", key: "user_fullname" },
                { header: "User Group Name", key: "user_group_name" },
                { header: "IVR/CQ Name", key: "ivr_cq_name" },
                { header: "Duration", key: "total_duration" },
                { header: "Answer Time", key: "billsecond" },
                { header: "Actual Talk Time", key: "actual_talktime" },
                { header: "Call Status", key: "call_status" },
                { header: "Hold Time", key: "hold_time" },
                { header: "Waiting Time", key: "waiting_time" },
                { header: "Ringing Time", key: "ringing_time" },
                { header: "Campaign", key: "campaign" },
                { header: "Lead Group Name", key: "lead_group_name" },
                { header: "Dial Method", key: "dial_method_label" },
                { header: "Disconnected By", key: "disconnected_by" },
                { header: "Disposition", key: "hangup_cause" },
                { header: "Sub Disposition 1", key: "hangup_cause_1" },
                { header: "Sub Disposition 2", key: "hangup_cause_2" },
                { header: "Direction", key: "direction" },
                { header: "CSAT Score", key: "ivr_feedback_score" },
                { header: "Comment", key: "notes" },
                { header: "Recording", key: "recording_path" }
            ];

            const headerString = columns.map(c => `"${c.header}"`).join(',');
            const rows = data.map(row => {
                return columns.map(c => {
                    let val: any = "";
                    if (c.key === "user_username") val = row.user?.username || row.agent || "";
                    else if (c.key === "user_fullname") val = row.user?.fullname || "";
                    else if (c.key === "user_group_name") val = row.user?.user_group?.name || "";
                    else if (c.key === "ivr_cq_name") val = row.ivr?.name || row.call_queue?.name || "";
                    else if (c.key === "campaign") val = row.outbound_campaign?.name || row.inbound_campaign?.name || row.blended_campaign?.name || "";
                    else if (c.key === "lead_group_name") val = row.lead_details?.lead_group?.name || "";
                    else if (c.key === "notes") val = row.notes?.comment || row.notes || "";
                    else if (c.key === "createdAt") val = row.createdAt ? new Date(row.createdAt).toISOString().replace('T', ' ').substring(0, 19) : "";
                    else if (c.key === "disconnected_by") val = row.disconnected_by === "0" ? "Agent" : (row.disconnected_by === "1" ? "Customer" : row.disconnected_by);
                    else val = row[c.key];

                    if (val === null || val === undefined) val = "";
                    if (typeof val === 'object') {
                        val = val.name || val.username || val.first_name || JSON.stringify(val);
                    }
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',');
            });
            return [headerString, ...rows].join('\r\n');
        } else if (reportType === 'user_performance') {
            const columns = [
                { header: "Date", key: "report_date" },
                { header: "User", key: "username" },
                { header: "Full Name", key: "fullname" },
                { header: "Total Calls", key: "totalCalls" },
                { header: "Inbound Call", key: "inbound_call_count" },
                { header: "Outbound Call", key: "outbound_call_count" },
                { header: "Agent Disconnection Count", key: "disconnected_by_agent" },
                { header: "Answered Calls", key: "successfulCalls" },
                { header: "ACD", key: "acd" },
                { header: "Login Time (HH:MM:SS)", key: "login_hours" },
                { header: "Net Login Time (HH:MM:SS)", key: "net_login_hours" },
                { header: "Idle Time (HH:MM:SS)", key: "total_idle_time" },
                { header: "Answer Time (HH:MM:SS)", key: "talk_time" },
                { header: "Actual Talktime (HH:MM:SS)", key: "actual_talktime" },
                { header: "Break Time (HH:MM:SS)", key: "break_time" },
                { header: "Break Info", key: "break_details" },
                { header: "ACW (HH:MM:SS)", key: "total_acw_time" },
                { header: "Pause Duration (HH:MM:SS)", key: "total_pause_time" },
                { header: "Total Ringing Time (HH:MM:SS)", key: "totalRingingTime" },
                { header: "Avg Ringing Time (HH:MM:SS)", key: "avgRingingTime" },
                { header: "Total Hold Time (HH:MM:SS)", key: "totalHoldTime" },
                { header: "Avg Hold Time (HH:MM:SS)", key: "avgHoldTime" },
                { header: "Avg CSAT Score", key: "csat_avg_score" },
                { header: "Disposition", key: "disposition_info" }
            ];

            const headerString = columns.map(c => `"${c.header}"`).join(',');
            const rows = data.map(row => {
                return columns.map(c => {
                    let val: any = "";
                    if (c.key === "break_details") {
                        if (row.break_details) {
                           try {
                             const parsed = typeof row.break_details === 'string' ? JSON.parse(row.break_details) : row.break_details;
                             val = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                           } catch(e) { val = row.break_details; }
                        }
                    } else if (c.key === "disposition_info") {
                        val = ""; // This is an info popup in the UI, usually fetched on demand
                    } else if (c.key === "report_date") {
                        val = row.report_date || (row.date ? new Date(row.date).toISOString().split('T')[0] : "");
                    } else {
                        val = row[c.key];
                    }

                    if (val === null || val === undefined) val = "";
                    if (typeof val === 'object') {
                        val = val.name || val.username || val.first_name || JSON.stringify(val);
                    }
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',');
            });
            return [headerString, ...rows].join('\r\n');
        } else if (reportType === 'login_logout') {
            const columns = [
                { header: "User", key: "agent_name" },
                { header: "Full Name", key: "fullname" },
                { header: "Date", key: "date" },
                { header: "Total Login Time(HH:MM)", key: "total_login_hours" },
                { header: "Net Login Time(HH:MM)", key: "net_login" },
                { header: "First Login Time(HH:MM)", key: "first_login_time" },
                { header: "Last Logout Time(HH:MM)", key: "last_login_time" },
                { header: "Total Count of Logins", key: "login_count" },
                { header: "Total Break Time(HH:MM)", key: "total_break_hours" },
                { header: "Total Count of Breaks", key: "break_count" }
            ];

            const headerString = columns.map(c => `"${c.header}"`).join(',');
            const rows = data.map(row => {
                return columns.map(c => {
                    let val: any = "";
                    if (c.key === "agent_name") val = row.agent?.username || row.agent_name || "";
                    else if (c.key === "fullname") val = row.agent?.fullname || row.fullname || "";
                    else if (c.key === "date") val = row.date ? new Date(row.date).toISOString().split('T')[0] : "";
                    else val = row[c.key];

                    if (val === null || val === undefined) val = "";
                    if (typeof val === 'object') {
                        val = val.name || val.username || val.first_name || JSON.stringify(val);
                    }
                    val = String(val).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',');
            });
            return [headerString, ...rows].join('\r\n');
        }
        
        // Define fields we do NOT want in the CSV for OTHER reports
        let excludeFields = ['_id', '__v', 'tenant_uuid', 'user_uuid', 'uuid', 'lead_uuid', 'campaign_uuid', 'email_config_uuid', 'trunk_uuid'];
        
        const header = Object.keys(data[0]).filter(key => !excludeFields.includes(key));
        const headerString = header.join(',');
        
        const rows = data.map(row => 
            header.map(fieldName => {
                let val = row[fieldName];
                if (val === null || val === undefined) {
                    val = "";
                } else if (typeof val === 'object') {
                    // Intelligently flatten populated Mongoose objects
                    if (Array.isArray(val)) {
                        val = val.map(item => {
                            if (typeof item === 'object') return item?.name || item?.username || item?.first_name || JSON.stringify(item);
                            return String(item);
                        }).join(' | ');
                    } else {
                        val = val?.name || val?.username || val?.first_name || val?.comment || JSON.stringify(val);
                    }
                }
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        );
        return [headerString, ...rows].join('\r\n');
    }

    @Cron(CronExpression.EVERY_MINUTE, { name: "Execute Mail Schedules" })
    async executeMailSchedules() {
        const enabled = process.env.CRON_SETUP === 'false';
        if (enabled) return;

        try {
            Logger.debug(`Execute Mail Schedules Cron - Started`);
            
            // Fetch all active schedules
            const activeSchedules = await this.mailSchedule.find({ status: "0" }).lean();
            console.log(`Total active mail schedules found: ${activeSchedules}`);
            if (!activeSchedules.length) return;
            console.log(`Found ${activeSchedules.length} active mail schedules`);
            for (const schedule of activeSchedules) {
                try {
                    // Determine tenant timezone
                    const tenant: any = await this.tenants.findOne({ uuid: schedule.tenant_uuid }).lean();
                    // If the tenant doesn't have a timezone set in the database, default to IST (Asia/Kolkata)
                    const timezone = tenant?.timezone || 'Asia/Kolkata';

                    // Evaluate timing against tenant's current local time
                    const currentTime = moment.tz(timezone);
                    const currentHHmm = currentTime.format('HH:mm');

                    // Check if schedule is active today
                    const today = currentTime.clone().startOf('day');
                    const start = moment.tz(schedule.startDate, timezone).startOf('day');
                    const end = moment.tz(schedule.endDate, timezone).startOf('day');

                    if (today.isBefore(start) || today.isAfter(end)) {
                        continue; // Skip because today is outside the scheduled date range
                    }

                    console.log(`currentHMM at ${currentHHmm} timezone (${timezone}) schedule timing ${schedule.timing} `);

                    if (schedule.timing === currentHHmm) {
                        Logger.log(`Running mail schedule: ${schedule.name} for tenant ${schedule.tenant_uuid}`);

                        // Fetch SMTP config
                        const mailConfig = await this.mailConfiguration.findOne({ uuid: schedule.email_config_uuid }).lean();
                        console.log(`Mail config for schedule ${schedule.uuid}:`, mailConfig);
                        if (!mailConfig) {
                            Logger.warn(`Mail configuration not found for schedule ${schedule.uuid}`);
                            continue;
                        }

                        // Get all users for tenant
                        const users = await this.user.find({ tenant_uuid: schedule.tenant_uuid }).lean();
                        const allUsers = users.map((u: any) => u.uuid);
                        
                        Logger.debug(`Found alibibjfjff ${allUsers.length} users for tenant ${schedule.tenant_uuid}`);

                        if (!allUsers.length) {
                            Logger.warn(`No users found for tenant ${schedule.tenant_uuid}, skipping report.`);
                            continue;
                        }

                        // Execute report query
                        const startMoment = moment.tz(schedule.startDate, timezone).startOf('day');
                        const endMoment = moment.tz(schedule.endDate, timezone).endOf('day');

                        const startDateFormatted = startMoment.format('YYYY-MM-DD HH:mm:ss');
                        const endDateFormatted = endMoment.format('YYYY-MM-DD HH:mm:ss');

                        const searchedData = {
                            tenant_uuid: schedule.tenant_uuid,
                            timezone: timezone,
                            startdate: startDateFormatted,
                            enddate: endDateFormatted,
                            // We set limit artificially high to get all records, or ideally the service fetches all without limit if not provided
                            limit: 100000 
                        };
                        
                        const reportTypes = schedule.report_type ? schedule.report_type.split(',') : [];
                        const attachments: Array<{ filename: string, content: string }> = [];
                        const reportNamesList: string[] = [];

                        for (const rType of reportTypes) {
                            const trimmedType = rType.trim();
                            if (!trimmedType) continue;

                            let reportData: any[] = [];
                            let csvData = "";
                            Logger.debug(`Executing report type: ${trimmedType} with dates ${startDateFormatted} to ${endDateFormatted}`);

                            switch (trimmedType) {
                                case 'user_performance':
                                    reportData = await this.userPerformanceReportService.getReportData(searchedData, allUsers) || [];
                                    break;
                                case 'cdr':
                                    // Use streamAdvancedSearchCsv with correct param names to match UI export
                                    const cdrSearchData = {
                                        tenant_uuid: schedule.tenant_uuid,
                                        role: 'tenant',
                                        timezone: timezone,
                                        callstart: startDateFormatted,
                                        callend: endDateFormatted,
                                        page: 1,
                                        limit: 100000
                                    };
                                    const mockRes = new MockResponse();
                                    await this.cdrsService.streamAdvancedSearchCsv(cdrSearchData, mockRes);
                                    if (mockRes.writeCount > 1) {
                                        csvData = mockRes.getCSVContent();
                                    }
                                    break;
                                case 'login_logout':
                                    const llSearchData = {
                                        tenant_uuid: schedule.tenant_uuid,
                                        timezone: timezone,
                                        startDate: startDateFormatted,
                                        endDate: endDateFormatted,
                                        page: 1,
                                        limit: 100000
                                    };

                                    const llRes: any = await this.loginLogoutReportService.advancedSearch(llSearchData);
                                    reportData = llRes?.data || llRes || [];
                                    break;
                                default:
                                    Logger.warn(`Unknown report type: ${trimmedType}`);
                            }
                            
                            const hasData = csvData ? true : (reportData.length > 0);
                            Logger.debug(`Report data fetched for ${trimmedType}. Has data: ${hasData}`);

                            if (hasData) {
                                const finalCsvData = csvData || this.jsonToCsv(reportData, trimmedType);
                                const friendlyNames: Record<string, string> = {
                                    cdr: "CDR_Report",
                                    user_performance: "User_Performance_Report",
                                    login_logout: "Login_Logout_Report",
                                    call_center: "Call_Center_Report"
                                };
                                const friendlyName = friendlyNames[trimmedType] || trimmedType;
                                const dateSuffix = new Date().toISOString().split('T')[0];
                                attachments.push({
                                    filename: `${friendlyName}_${dateSuffix}.csv`,
                                    content: finalCsvData
                                });
                                reportNamesList.push(friendlyName.replace(/_/g, ' '));
                            }
                        }
                        console.log(attachments,'attachmentss');
                        
                        if (attachments.length > 0) {
                            const combinedReportNames = reportNamesList.join(", ");
                            let emailBody = `<p>Please find the attached report(s): ${combinedReportNames} spanning from ${schedule.startDate} to ${schedule.endDate}.</p>`;
                            
                            if (mailConfig.template_ids && mailConfig.template_ids.length > 0) {
                                const templateUuid = mailConfig.template_ids[0];
                                const templateRecord = await this.emailTemplate.findOne({ uuid: templateUuid }).lean();
                                
                                if (templateRecord && templateRecord.body) {
                                    emailBody = templateRecord.body
                                        .replace(/\[REPORT_NAME\]/g, combinedReportNames)
                                        .replace(/\[START_DATE\]/g, moment(schedule.startDate).format('YYYY-MM-DD'))
                                        .replace(/\[END_DATE\]/g, moment(schedule.endDate).format('YYYY-MM-DD'));
                                }
                            }
                            console.log(`Sending email for schedule ${attachments} attachments.`);
                            
                            await this.mailService.sendReportMail(mailConfig, attachments, emailBody, combinedReportNames);
                            Logger.log(`Successfully sent mail schedule ${schedule.uuid} with ${attachments.length} reports.`);
                        } else {
                            Logger.warn(`No data found for schedule ${schedule.uuid} between ${schedule.startDate} and ${schedule.endDate}, skipping email dispatch.`);
                        }
                    }
                } catch (schedError: any) {
                    Logger.error(`Error executing mail schedule ${schedule.name} (${schedule.uuid}): `, schedError.stack || schedError.message);
                }
            }
        } catch (error: any) {
            Logger.error(`Execute Mail Schedules Cron - Catch block ==> `, error.message);
        }
    }

}
