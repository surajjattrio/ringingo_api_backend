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
        private readonly requestSchedulerService: RequestSchedulerService
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

}
