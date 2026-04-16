import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
    RequestSchedulerDocument,
    RequestSchedulerSchema,
} from "../schema/request-scheduler.schema";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import { writeToPath } from "@fast-csv/format";
import * as archiver from "archiver";

// Also inject CDRS model
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";

function getAppRoot() {
    // when running locally -> project root
    if (process.cwd().includes("dist")) {
        return path.resolve(process.cwd(), "..");
    }
    return process.cwd();
}

const baseDir = getAppRoot();
@Injectable()
export class RequestSchedulerService {

    constructor(
        @InjectModel(RequestSchedulerSchema.name) private readonly request_scheduler: Model<RequestSchedulerDocument>,
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
    ) { }

    /* ========================= Helper to map dial method ========================= */
    private async ensureDirectoryExists(dirPath: string) {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (err) {
            console.error("Directory creation failed:", err);
            throw err;
        }
    }

    private mapDialMethod(dialMethod: string): string {
        switch (dialMethod) {
            case "0":
                return "Manual Dial";
            case "1":
                return "Auto Dial";
            case "2":
                return "Preview Dial";
            case "3":
                return "Predictive Dial";
            default:
                return "";
        }
    }

    private readonly getDispositionPathNames = async (
        dispositionModel: any, // mongoose model
        tenant_uuid: string,
        startDispositionUuid: string,
        options?: {
            maxDepth?: number;          // safety to prevent infinite loops
            stopOnEmptyParent?: boolean; // default true
        }
    ): Promise<string[]> => {
        const maxDepth = options?.maxDepth ?? 50;
        const stopOnEmptyParent = options?.stopOnEmptyParent ?? true;

        const namesChildToRoot: any = [];
        const visited = new Set<string>();

        let currentUuid: any = startDispositionUuid;

        for (let depth = 0; depth < maxDepth; depth++) {
            if (!currentUuid) break;
            if (visited.has(currentUuid)) break; // cycle protection
            visited.add(currentUuid);

            const doc = await dispositionModel
                .findOne({ tenant_uuid, disposition_uuid: currentUuid })
                .select({ name: 1, parent_disposition: 1 })
                .lean();

            if (!doc) break;

            if (doc.name) namesChildToRoot.push(doc.name);

            const parent = doc.parent_disposition;

            // stop conditions
            if (stopOnEmptyParent && (parent === "" || parent == null)) break;

            currentUuid = parent;
        }

        // convert to ROOT -> ... -> CHILD
        return namesChildToRoot.reverse();
    }

    async findAll(query: any) {
        const { tenant_uuid, request_status, page = 1, limit = 10 } = query;

        if (!tenant_uuid) { return { statusCode: 200, data: { total: 0, page: Number(page), limit: Number(limit), list: [], } }; }

        const matchFilter: any = { tenant_uuid };
        // ✅ optional filter by status
        if (request_status) { matchFilter.request_status = request_status; }

        const skip = (Number(page) - 1) * Number(limit);
        const [total, list] = await Promise.all([
            this.request_scheduler.countDocuments(matchFilter),
            // ✅ returns FULL document (ALL fields)
            this.request_scheduler.find(matchFilter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean()
        ]);

        // ✅ if you want full URL for download
        const BASE_URL = process.env.BACKEND_BASE_URL || "";
        const finalList = (list || []).map((item: any) => ({ ...item, csv_url: item?.csv_path ? `${BASE_URL}${item.csv_path}` : "" }));

        return { statusCode: 200, data: { total, page: Number(page), limit: Number(limit), list: finalList, } };
    }

    /* POST : Create scheduler request and request_status allowed: pending | inprogress | completed */
    async create(body: any) {
        const { tenant_uuid, report_name, callstart, callend, disposition, baseUrl, bulk_download = false, request_status = "pending", mapping = {} } = body;

        if (!tenant_uuid) return { statusCode: 400, message: "Tenant_uuid is required" };
        if (!report_name) return { statusCode: 400, message: "Report name is required" };
        if (!callstart || !callend) return { statusCode: 400, message: "Callstart and Callend are required" };
        // if (!mapping || typeof mapping !== "object") return { statusCode: 400, message: "Please map CSV Headers" };
        if (mapping && typeof mapping !== "object") return { statusCode: 400, message: "Mapping must be an object" };

        // pick filters like caller_id_name|1
        const filtersFromRoot = Object.fromEntries(Object.entries(body || {}).filter(([k]) => k.includes("|")));
        const filtersFromBody = body?.filters || {};
        const finalFilters = { ...filtersFromRoot, ...filtersFromBody };
        const mongoQuery: any = { tenant_uuid, createdAt: { $gte: callstart, $lte: callend }, hangup_cause: disposition };    // Build Mongo Query

        Object.entries(finalFilters || {}).forEach(([rawKey, val]: any) => {
            if (!val) return;
            const [field, mode] = rawKey.split("|");

            if (Array.isArray(val)) {
                mongoQuery[field] = { $in: val };
            } else if (mode === "1") {
                mongoQuery[field] = { $regex: val, $options: "i" };
            } else if (mode === "2") {
                mongoQuery[field] = { $regex: `^${val}`, $options: "i" };
            } else {
                mongoQuery[field] = val;
            }
        });

        // Normalize bulk_download to "yes"/"no"
        let bulkDownloadStr = "no";
        if (bulk_download === true || bulk_download === "true" || bulk_download === "yes") {
            bulkDownloadStr = "yes";
        }

        const savedData = await this.request_scheduler.create({
            tenant_uuid,
            name: report_name,
            callstart,
            callend,
            bulk_download: bulkDownloadStr,
            request_status,
            disposition,
            mapping,
            baseUrl,
            filters: finalFilters
        });

        return { statusCode: 201, message: "Request scheduled successfully", data: savedData };
    }

    /** Cron requests from request_scheduler collection */
    async processPendingRequests() {
        const pendingRequests = await this.request_scheduler.find({ request_status: "pending" }).limit(5).lean();
        const downloadRequests = await this.request_scheduler.find({ bulk_status: "pending" }).limit(5).lean();

        /* ---------- COMMON FILTER BUILDER ---------- */
        const buildMongoQuery = (req: any, startDate: Date, endDate: Date) => {
            const { filters = {}, tenant_uuid } = req;
            const mongoQuery: any = { tenant_uuid, createdAt: { $gte: startDate, $lte: endDate } };
            const FIELD_MAP: any = { disposition: "hangup_cause" };

            Object.entries(filters || {}).forEach(([rawKey, val]: any) => {
                if (!val) return;

                const [field, mode] = rawKey.split("|");
                const dbField = FIELD_MAP[field] || field;

                if (Array.isArray(val)) {
                    mongoQuery[dbField] = { $in: val };
                } else if (mode === "1") {
                    mongoQuery[dbField] = { $regex: val, $options: "i" };
                } else if (mode === "2") {
                    mongoQuery[dbField] = { $regex: `^${val}`, $options: "i" };
                } else if (mode === "4") {
                    mongoQuery[dbField] = val; // exact match (UUID case)
                } else {
                    mongoQuery[dbField] = val;
                }
            });

            return mongoQuery;
        };

        /* ================= CSV GENERATION ================= */
        for (const cdrsReq of pendingRequests) {
            try {
                const startDate = moment(cdrsReq.callstart, "YYYY-MM-DD HH:mm:ss").toDate();
                const endDate = moment(cdrsReq.callend, "YYYY-MM-DD HH:mm:ss").toDate();

                await this.request_scheduler.updateOne(
                    { uuid: cdrsReq.uuid, request_status: "pending" },
                    { $set: { request_status: "inprogress" } }
                );

                const mongoQuery = buildMongoQuery(cdrsReq, startDate, endDate);

                let populateFields = [
                    { path: "user", select: "username fullname user_group_uuid", populate: { path: "user_group", select: "name uuid" } },
                    { path: "extension", select: 'username' },
                    { path: "tenant", select: 'tenant_name username ' },
                    { path: "lead_details", select: 'first_name last_name lead_group_uuid uuid', populate: { path: "lead_group", select: "name uuid" } },
                    { path: 'telecom_circle', select: 'name uuid -_id' },
                    { path: "outbound_campaign", select: "name dial_method wrap_up_time" },
                    { path: "inbound_campaign", select: "name wrap_up_time" },
                    { path: "blended_campaign", select: "name dial_method wrap_up_time" },
                    { path: "notes", select: "comment" }
                ];

                const result = await this.cdrs.find(mongoQuery).populate(populateFields).sort({ createdAt: -1 }).lean();

                const processedResult = await Promise.all(
                    result.map(async (item: any) => {

                        // Normalize hangup cause tree
                        if (item?.hangup_cause && item.hangup_cause.trim() !== "") {
                            const pathArr = await this.getDispositionPathNames(
                                this.disposition,
                                cdrsReq?.tenant_uuid,
                                item.hangup_cause,
                                { maxDepth: 50 }
                            );

                            item.hangup_cause = pathArr[0] ?? "-";
                            item.hangup_cause_1 = pathArr[1] ?? "-";
                            item.hangup_cause_2 = pathArr[2] ?? "-";
                        } else {
                            item.hangup_cause = "-";
                            item.hangup_cause_1 = "-";
                            item.hangup_cause_2 = "-";
                        }

                        return item;
                    })
                );

                const BASE_RECORDING_URL = cdrsReq.baseUrl ? `${cdrsReq.baseUrl}/recordings/download/recording?recording=` : "";

                let cdrsData = processedResult.map((cdr: any) => {
                    const recordingPath = cdr?.recording_path || "";
                    const recordingUrl = cdr?.billsecond > 0 && recordingPath ? `${BASE_RECORDING_URL}${recordingPath}` : "";
                    let disconnectedBy = "";

                    if (cdr?.disconnected_by === "0") { disconnectedBy = "Agent"; }
                    else if (cdr?.disconnected_by === "1") { disconnectedBy = "Customer"; }
                    else if (cdr?.disconnected_by === "2") { disconnectedBy = "Automatic"; }

                    const rawBillsecond = cdr?.direction === 'outbound' ? Number.parseInt(cdr?.billsecond) || 0 : (Number.parseInt(cdr?.total_duration) || 0) - (Number.parseInt(cdr?.waiting_time) || 0);
                    const rawHoldTime = Number.parseInt(cdr?.hold_time) || 0;
                    const rawWaitingTime = Number.parseInt(cdr?.waiting_time) || 0;
                    const rawRingingTime = Number.parseInt(cdr?.ringing_time) || 0;
                    const computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;

                    return {
                        "lead_uuid": cdr.lead_uuid,
                        "Start Date": cdr.callstart,
                        "End Date": cdr.callend,
                        "Caller Id Number": cdr?.caller_id_number,
                        "DID / Phone Number": cdr?.destination_number,
                        "User ID": cdr.user?.[0]?.username || "",
                        "Agent Name": `${cdr.user?.[0]?.username || ""} - ${cdr.user?.[0]?.fullname || ""}`.trim(),
                        "Campaign Name":
                            cdr?.outbound_campaign?.[0]?.name ||
                            cdr?.inbound_campaign?.[0]?.name ||
                            cdr?.blended_campaign?.[0]?.name ||
                            "",
                        "List Name": cdr?.lead_details?.[0]?.lead_group?.[0]?.name || "",
                        "Total Duration": moment.utc((computedTotalDuration || 0) * 1000).format("HH:mm:ss"),
                        "Ringing Time": moment.utc((rawRingingTime || 0) * 1000).format("HH:mm:ss"),
                        "Answer Time": moment.utc((rawBillsecond || 0) * 1000).format("HH:mm:ss"),
                        "Waiting Time": moment.utc((rawWaitingTime || 0) * 1000).format("HH:mm:ss"),
                        "Hold Time": moment.utc((rawHoldTime || 0) * 1000).format("HH:mm:ss"),
                        "Dial Method": this.mapDialMethod(cdr?.dial_method),
                        "Direction": cdr?.direction
                            ? cdr.direction.toLowerCase().charAt(0).toUpperCase() + cdr.direction.toLowerCase().slice(1)
                            : "",
                        "Disconnected By": disconnectedBy,
                        // "System Disposition": cdr?.disposition || "",
                        "Disposition": cdr?.hangup_cause || "",
                        "Sub Disposition 1": cdr?.hangup_cause_1 || "",
                        "Sub Disposition 2": cdr?.hangup_cause_2 || "",
                        "Comment": cdr?.notes?.[0]?.comment || "",
                        // "Department": cdr?.tenant?.[0]?.tenant_name || "",
                        "Recording URL": recordingUrl
                    };
                });

                const leadUUIDs = [...new Set((result || []).map((x: any) => x.lead_uuid).filter(Boolean))];      // Fetch Lead Custom Fields

                let leadMap: Record<string, any> = {};
                let customKeys = new Set<string>();

                if (leadUUIDs.length) {
                    // Fetch all lead management fields including custom fields
                    const leadDocs = await this.lead_management.find(
                        { lead_management_uuid: { $in: leadUUIDs } },
                        {
                            lead_management_uuid: 1,
                            first_name: 1,
                            last_name: 1,
                            address: 1,
                            state: 1,
                            province: 1,
                            postal_code: 1,
                            dob: 1,
                            phone_code: 1,
                            phone_number: 1,
                            alternate_phone_number: 1,
                            email: 1,
                            status: 1,
                            gender: 1,
                            description: 1,
                            city: 1,
                            custom_phone_number: 1,
                            call_count: 1,
                            in_dnc: 1,
                            converted_date: 1,
                            product1: 1,
                            custom_fields: 1,
                            _id: 0
                        }
                    ).lean();

                    for (const lead of leadDocs) {
                        const uuid = lead.lead_management_uuid;
                        let cf = lead.custom_fields || {};
                        
                        // merge but REMOVE custom_fields key itself
                        const { custom_fields, lead_management_uuid, ...restLead } = lead;
                        cf = { ...restLead, ...cf};
                        leadMap[uuid as string] = cf;
                        Object.keys(cf).forEach((k) => customKeys.add(k));
                    }
                }

                const customHeaders = Array.from(customKeys);

                /* Merge + Clean */
                cdrsData = (cdrsData || []).map((cdr: any) => {
                    const cf = leadMap[cdr.lead_uuid] || {};
                    const cfColumns: any = {};
                    customHeaders.forEach((k) => { cfColumns[k] = cf?.[k] ?? ""; });
                    const merged = { ...cdr, ...cfColumns };
                    // return this.cleanRow(merged);
                    return merged;
                });

                /* Apply Partial Header Rename */
                // original ordered headers from cdrsData

                /* ---------- NORMALIZE HEADER MAPPING ---------- */
                let mapping: Record<string, string> = {};

                // handle mapping stored as JSON string in DB
                if (typeof cdrsReq.mapping === "string") {
                    try {
                        mapping = JSON.parse(cdrsReq.mapping);
                    } catch {
                        mapping = {};
                    }
                } else if (typeof cdrsReq.mapping === "object" && cdrsReq.mapping !== null) {
                    mapping = { ...cdrsReq.mapping };
                }

                /* trim keys & values (server DB often stores spaces) */
                mapping = Object.fromEntries(
                    Object.entries(mapping).map(([k, v]) => [
                        k.trim(),
                        typeof v === "string" ? v.trim() : v,
                    ])
                );

                /* ---------- APPLY HEADER MAPPING ---------- */
                // const defaultHeaders = [
                //     "Start Date", "End Date", "Caller Id Number", "DID / Phone Number", "User ID",
                //     "Agent Name", "Campaign Name", "List Name", "Total Duration", "Ringing Time",
                //     "Answer Time", "Waiting Time", "Hold Time", "Dial Method", "Direction",
                //     "Disconnected By", "Disposition", "Sub Disposition 1",
                //     "Sub Disposition 2", "Comment", "Recording URL"
                // ];
                // const mappingKeys = Object.keys(mapping);
                // if (!mappingKeys.includes("Recording URL")) {
                //     mappingKeys.push("Recording URL");
                // }
                // const originalHeaders = mappingKeys.length > 0 ? mappingKeys : defaultHeaders;
                const originalHeaders = cdrsData.length ? Object.keys(cdrsData[0]) : [];

                // apply mapping but preserve order
                const mappedHeaders = originalHeaders.map(h => mapping[h] || h);

                // map rows as arrays to preserve columns even if custom headers are duplicated
                const orderedData = cdrsData.map((row: any) => {
                    return originalHeaders.map(h => row[h] || "-");
                });

                const exportDir = path.join(baseDir, "upload", "reports", "scheduler_csv");
                await this.ensureDirectoryExists(exportDir);

                const fileName = `${cdrsReq.uuid}.csv`;
                const filePath = path.join(exportDir, fileName);

                await new Promise((resolve, reject) => {
                    writeToPath(filePath, orderedData, { headers: mappedHeaders, writeHeaders: true })
                        .on("finish", () => {
                            console.log("CSV created:", filePath);
                            resolve(true);
                        })
                        .on("error", (err) => {
                            console.error("CSV ERROR:", err);
                            reject(err);
                        });
                });

                await this.request_scheduler.updateOne(
                    { uuid: cdrsReq.uuid },
                    { $set: { request_status: "completed", csv_path: `/upload/reports/scheduler_csv/${fileName}`, total_rows: orderedData.length } }
                );
            } catch (err: any) {
                await this.request_scheduler.updateOne(
                    { uuid: cdrsReq.uuid },
                    { $set: { request_status: "failed", error_message: err?.message || "Unknown error" } }
                );
            }
        }

        /* ================= BULK RECORDING ZIP ================= */
        for (const recReq of downloadRequests) {
            try {
                const bulkFlag = (recReq?.bulk_download || "").toString().trim().toLowerCase();

                /* ✅ Skip invalid jobs permanently */
                if (bulkFlag !== "yes") {
                    console.log(`Skipping bulk job ${recReq.uuid} → marked not requested`);

                    await this.request_scheduler.updateOne(
                        { uuid: recReq.uuid, bulk_status: "pending" },
                        { $set: { bulk_status: "not requested" } }
                    );
                    continue;
                }

                /* ✅ Claim job safely */
                const claimed = await this.request_scheduler.updateOne(
                    { uuid: recReq.uuid, bulk_status: "pending" },
                    { $set: { bulk_status: "inprogress" } }
                );

                if (!claimed.modifiedCount) {
                    continue;
                }

                const startDate = moment(recReq.callstart, "YYYY-MM-DD HH:mm:ss").toDate();
                const endDate = moment(recReq.callend, "YYYY-MM-DD HH:mm:ss").toDate();
                const mongoQuery = buildMongoQuery(recReq, startDate, endDate);
                // mongoQuery.billsecond = { $gt: 0 }; // ✅ IMPORTANT: Only fetch billsecond > 0
                const recordings = await this.cdrs.find(mongoQuery).sort({ _id: -1 }).exec();

                if (!recordings.length) {
                    await this.request_scheduler.updateOne(
                        { uuid: recReq.uuid },
                        { $set: { bulk_status: "completed", total_recordings: 0 } }
                    );
                    continue;
                }

                /* ✅ ensure export folder exists */
                const exportDir = path.join(process.cwd(), "upload", "reports", "scheduler_zip");
                await this.ensureDirectoryExists(exportDir);

                const zipFileName = `${recReq.uuid}.zip`;
                const zipPath = path.join(exportDir, zipFileName);
                const output = fs.createWriteStream(zipPath);   // ✅ create file stream
                const archive = archiver("zip", { zlib: { level: 9 } });
                archive.on("warning", console.warn);
                archive.on("error", console.error);

                archive.pipe(output);
                // let addedCount = 0; // ✅ count only valid added files

                for (const rec of recordings) {
                    const filePath = rec.recording_path?.toString();

                    if (!filePath) {
                        console.error("Recording path missing");
                        continue;
                    }

                    if (fs.existsSync(filePath)) {
                        let fileName = path.basename(filePath);

                        // ✅ add number prefix
                        const number = rec?.direction === "outbound" ? rec?.destination_number : rec?.caller_id_number;

                        if (number) {
                            // sanitize number (remove special chars)
                            const safeNumber = number.toString().replace(/[^a-zA-Z0-9]/g, "");
                            fileName = `${safeNumber}_${fileName}`;
                        }

                        archive.file(filePath, { name: fileName });
                        // addedCount++; // ✅ increment only if file added
                    } else {
                        console.error(`File missing: ${filePath}`);
                    }
                }

                /* ✅ If no files actually added */
                // if (addedCount === 0) {
                //     await this.request_scheduler.updateOne(
                //         { uuid: recReq.uuid },
                //         { $set: { bulk_status: "completed", total_recordings: 0 } }
                //     );
                //     continue;
                // }

                await new Promise((resolve, reject) => {
                    output.on("close", resolve);
                    archive.on("error", reject);
                    archive.finalize();
                });

                console.log(`ZIP generated successfully`);

                await this.request_scheduler.updateOne(
                    { uuid: recReq.uuid, bulk_status: "inprogress" },
                    // { $set: { bulk_status: "completed", bulk_path: `/upload/reports/scheduler_zip/${zipFileName}`, total_recordings: addedCount } }
                    { $set: { bulk_status: "completed", bulk_path: `/upload/reports/scheduler_zip/${zipFileName}`, total_recordings: recordings.length } }
                );

            } catch (err: any) {
                console.error("Bulk ZIP error:", err);
                await this.request_scheduler.updateOne(
                    { uuid: recReq.uuid },
                    { $set: { bulk_status: "failed", error_message: err?.message || "Unknown error" } }
                );
            }
        }
    }

    async deleteRequest(uuid: string) {
        const doc = await this.request_scheduler.findOne({ uuid }).lean();
        if (!doc) return { statusCode: 404, message: "Not found" };

        if (doc.csv_path && doc.bulk_path) {
            const csvPath = path.join(process.cwd(), doc.csv_path.replace("/", ""));
            const zipPath = path.join(process.cwd(), doc.bulk_path.replace("/", ""));
            if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }

        await this.request_scheduler.deleteOne({ uuid });
        return { statusCode: 200, message: "Deleted successfully" };
    }

}
