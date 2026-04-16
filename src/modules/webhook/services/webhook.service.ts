import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CdrsDocument, CdrsSchema } from "../../cdrs/schema/cdrs.schema";
import * as moment from "moment-timezone";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Webhook, WebhookDocument } from "src/modules/webhook/schema/webhook.schema";

@Injectable()
export class WebhookService {
    private readonly MAX_RETRY = 3;
    private readonly WEBHOOK_TIMEOUT = 15000;
    private readonly webhookUrl = "https://eos.onefin.app/api/Kpo/webhook";
    private readonly tenantUuid = "c1794f5d-8cf3-4e3e-972c-eba0262bef40";
    private readonly notInUser = ["87553724-5392-4ad4-9203-e1828bc59246", "c6e23967-f6e5-49e8-8e70-f12288cf557e"];

    constructor(
        @InjectModel(Webhook.name) private readonly webhookModel: Model<WebhookDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly http: HttpService,
    ) { }

    private normalizeIndianNumber(phone) {
        let num = phone.replace(/\D/g, ""); // remove non-digits
        num = num.replace(/^\+?91/, "");    // remove leading 91
        if (num.length > 10) { num = num.slice(-10); } // keep last 10 digits
        // if (!/^[6-9]\d{9}$/.test(num)) { return null; } // Validate Indian number or throw error if invalid
        return num;
    }

    private getPopulateFields() {
        return [
            { path: "user", select: "username fullname user_group_uuid", populate: { path: "user_group", select: "name uuid" } },
            { path: "extension", select: "username" },
            { path: "tenant", select: "tenant_name username domain" },
            { path: "lead_details", select: "first_name last_name lead_group_uuid uuid", populate: { path: "lead_group", select: "name uuid" } },
            { path: "telecom_circle", select: "name uuid -_id" },
            { path: "outbound_campaign", select: "name dial_method wrap_up_time uuid" },
            { path: "inbound_campaign", select: "name wrap_up_time uuid" },
            { path: "blended_campaign", select: "name dial_method wrap_up_time uuid" },
            { path: "notes", select: "comment" },
            { path: "ivr", select: "name uuid -_id" },
            { path: "call_queue", select: "name uuid -_id" },
            { path: "follow_up", select: "type date_time reminder_date_time -_id" },
        ];
    }

    private async buildDispositionMap(): Promise<Map<string, any>> {
        const allDispositions = await this.disposition
            .find()
            .select({ name: 1, disposition_uuid: 1, parent_disposition: 1 })
            .lean();

        return new Map(allDispositions.map((d: any) => [d.disposition_uuid, d]));
    }

    // Returns names from ROOT -> ... -> CHILD (Sync cache-based)
    private getDispositionPathSync(dispositionMap: Map<string, any>, startUuid: string): string[] {
        const names: string[] = [];
        const visited = new Set<string>();
        let currentUuid = startUuid;

        for (let depth = 0; depth < 50; depth++) {
            if (!currentUuid || visited.has(currentUuid)) break;
            visited.add(currentUuid);

            const doc = dispositionMap.get(currentUuid);
            if (!doc) break;

            if (doc.name) names.push(doc.name);
            currentUuid = doc.parent_disposition;
            if (!currentUuid) break;
        }
        return names.reverse();
    }

    private getLatestReminder(followUp: any[]): string {
        if (!Array.isArray(followUp) || !followUp.length) return "";

        let latestReminder = "";
        let latestTime = 0;

        for (const item of followUp) {
            const time = new Date(item?.reminder_date_time).getTime();
            if (time > latestTime) {
                latestTime = time;
                latestReminder = item?.reminder_date_time || "";
            }
        }

        return latestReminder;
    }

    private async fetchWebhookCandidates() {
        const startDate = new Date(new Date().setHours(0, 0, 0, 0));
        const endDate = new Date(new Date().setHours(23, 59, 59, 999));

        return this.cdrs
            .find({
                tenant_uuid: this.tenantUuid,
                isSend: 0,
                user_uuid: { $nin: this.notInUser },
                hangup_cause: { $nin: [""] },
                createdAt: { $gte: startDate, $lte: endDate },
            })
            .sort({ createdAt: -1 })
            .limit(200)
            .populate(this.getPopulateFields())
            .lean()
            .exec();
    }

    private buildPayload(doc: any, dispositionMap: Map<string, any>) {
        const dialMethodMap: Record<string, string> = { "0": "Manual", "1": "Auto", "2": "Preview", "3": "Predictive" };

        const {
            user, tenant, extension, outbound_campaign, notes, lead_details,
            follow_up, hangup_cause, total_duration, callstart, callend, recording_path,
            _id, lead_uuid, destination_number, dial_method, disconnected_by
        } = doc;

        const username = user?.[0]?.username ?? "";
        const fullname = user?.[0]?.fullname ?? "";
        const agentFullName = username && fullname ? `${username} - ${fullname}` : username || fullname || "";
        const formattedStart = moment.tz(new Date(callstart + "Z"), "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
        const formattedEnd = callend ? moment.tz(new Date(callend + "Z"), "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : "";
        const dispositionPath = this.getDispositionPathSync(dispositionMap, hangup_cause);
        const [d1 = "", d2 = "", d3 = ""] = dispositionPath;

        const payload = {
            agentFullName,
            disconnectedBy: disconnected_by === "0" ? "Agent" : "Customer",
            recordingPublicLink: recording_path ? `https://ccprocessapi.ringingo.com/recordings/download/recording?recording=${recording_path}` : "",
            dialerUrl: tenant?.[0]?.domain ?? "",
            referenceUuid: _id?.toString() ?? "",
            callBackDate: this.getLatestReminder(follow_up),
            disposeComment: notes?.[0]?.comment ?? "",
            disposeName: d1,
            modeOfCalling: dialMethodMap[dial_method] ?? "Unknown",
            startDate: formattedStart.slice(0, 10),
            agentExtension: extension?.[0]?.username ?? "",
            campaignName: outbound_campaign?.[0]?.name ?? "",
            slashDispose: notes?.[0]?.comment ?? "",
            leadsetName: lead_details?.[0]?.lead_group?.[0]?.name ?? "",
            processName: "Outbound",
            startDateTime: formattedStart,
            totalTalkTime: Number(total_duration),
            totalTalkTimeInMin: Number(total_duration),
            status: d1,
            unique_leadid: "",
            first_dispose: d1,
            second_dispose: d2,
            third_dispose: d3,
            endDateTime: formattedEnd,
            mobile_number: this.normalizeIndianNumber(destination_number) ?? "",
        };

        return { payload, lead_uuid, };
    }

    private async upsertPendingWebhook(referenceUuid: string, lead_uuid: string, payload: any) {
        await this.webhookModel.updateOne(
            { reference_id: referenceUuid },
            {
                $setOnInsert: {
                    reference_id: referenceUuid,
                    lead_uuid,
                    status: "pending",
                    isSend: 0,
                    retryCount: 0,
                },
                $set: { shareData: payload },
            },
            { upsert: true },
        );
    }

    private async markWebhookSuccess(referenceUuid: string, lead_uuid: string, payload: any, response: any) {
        await this.webhookModel.updateOne(
            { reference_id: referenceUuid },
            {
                $set: {
                    lead_uuid,
                    isSend: 1,
                    status: "success",
                    retryCount: 0,
                    response_code: response?.data?.status ?? response?.status ?? 200,
                    response_status: response?.data?.data ?? "success",
                    response: JSON.stringify(response?.data ?? {}),
                    shareData: payload,
                },
            },
        );
    }

    private async markWebhookFailed(referenceUuid: string, lead_uuid: string, payload: any, err: any) {
        await this.webhookModel.updateOne(
            { reference_id: referenceUuid },
            {
                $inc: { retryCount: 1 },
                $set: {
                    lead_uuid,
                    isSend: 0,
                    status: "failed",
                    response_code: err?.response?.status ?? null,
                    response_status: err?.response?.data?.message ?? "failed",
                    response: JSON.stringify(err?.response?.data ?? {}),
                    shareData: payload,
                },
            },
        );
    }

    private buildCdrSuccessUpdate(referenceUuid: string) {
        return {
            updateOne: {
                filter: {
                    _id: new Types.ObjectId(referenceUuid),
                    tenant_uuid: this.tenantUuid,
                    isSend: 0,
                },
                update: { $set: { isSend: 1 } },
            },
        };
    }

    private async processWebhookItem(item: { payload: any; lead_uuid: string }) {
        const { payload, lead_uuid } = item;
        const referenceUuid = payload.referenceUuid;

        const existingWebhook = await this.webhookModel
            .findOne({ reference_id: referenceUuid })
            .select({ retryCount: 1, status: 1, isSend: 1 })
            .lean() as unknown as { retryCount?: number; status?: string; isSend?: number } | null;

        if (existingWebhook?.retryCount >= this.MAX_RETRY) {
            Logger.warn(`Max retry reached for ${referenceUuid}`);
            return null;
        }

        await this.upsertPendingWebhook(referenceUuid, lead_uuid, payload);

        try {
            const response = await firstValueFrom(
                this.http.post(this.webhookUrl, payload, {
                    headers: {
                        "Content-Type": "application/json",
                        accept: "*/*",
                    },
                    timeout: this.WEBHOOK_TIMEOUT,
                }),
            );

            if (response?.status >= 200 && response?.status < 300) {
                await this.markWebhookSuccess(referenceUuid, lead_uuid, payload, response);
                Logger.log(`[Webhook Success] ${referenceUuid} - HTTP: ${response.status}`);
                return this.buildCdrSuccessUpdate(referenceUuid);
            }

            await this.markWebhookFailed(referenceUuid, lead_uuid, payload, {
                message: `Unexpected HTTP status: ${response?.status}`,
                response: { status: response?.status, data: response?.data },
            });

            Logger.warn(`[Webhook Failed] ${referenceUuid} - Unexpected HTTP: ${response?.status}`);

            return null;
        } catch (err: any) {
            await this.markWebhookFailed(referenceUuid, lead_uuid, payload, err);
            Logger.error(`Webhook failed for ${referenceUuid}: ${err?.message}`);
            return null;
        }
    }

    async get1financeWebhookData() {
        const dispositionMap = await this.buildDispositionMap();
        const docs = await this.fetchWebhookCandidates();

        if (!docs.length) { return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, []); }

        const payloads = docs.map((doc) => this.buildPayload(doc, dispositionMap));
        const cdrUpdates = await Promise.all(payloads.map((item) => this.processWebhookItem(item)));
        const bulkCdrUpdates = cdrUpdates.filter(Boolean);

        if (bulkCdrUpdates.length) { await this.cdrs.bulkWrite(bulkCdrUpdates); }

        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, payloads);
    }
}