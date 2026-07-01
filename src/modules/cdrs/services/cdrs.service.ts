import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CdrsDocument, CdrsSchema } from "../schema/cdrs.schema";
import { IvrDocument, IvrSchema } from "src/modules/ivr/schema/ivr.schema";
import { RinggroupDocument, RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { CallQueueDocument, CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema"
import * as moment from 'moment-timezone';
import { query } from "express";
import { CDRSArchieveSearchService } from "../services/cdrs-archive-search.service";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";



@Injectable()
export class CdrsService {

    /*
    @Usage              : To load cdrs schema and other libraries
    @Param @InjectModel : It will load cdrs schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [cdrs,commonDbFn]
    */

    constructor(
        @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(IvrSchema.name) private readonly ivr: Model<IvrDocument>,
        @InjectModel(RinggroupSchema.name) private readonly ring_group: Model<RinggroupDocument>,
        @InjectModel(CallQueueSchema.name) private readonly call_queue: Model<CallQueueDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        private readonly cDRSArchieveSearchService: CDRSArchieveSearchService,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,

    ) { }

    /*
    @Usage              : To search cdrs using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of cdrs with data
    */

    async advancedSearch(searchParams) {
        let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;
        let objWC, whereClause: any = [];

        //Check Role type
        let { role, tenant_uuid, uuid } = searchParams;
        if (role == "tenant") {
            where.push({ tenant_uuid: tenant_uuid });
            whereClause.push({ tenant_uuid: tenant_uuid });
        } else if (role == "agent") {
            where.push({ user_uuid: uuid });
            whereClause.push({ user_uuid: uuid });
        }
        // ===========================
        // ✅✅✅ CSAT FILTER (ONLY WHEN KEY EXISTS)
        // ===========================
        const isCsat =
            (searchParams.only_csat && String(searchParams.only_csat).toLowerCase() === "yes");

        if (isCsat) {
            // ✅ return only docs where ivr_feedback_score exists AND is not null/undefined
            where.push({ is_csat: "0" })
            whereClause.push({ is_csat: "0" })
        }

        delete searchParams.only_csat;
        delete searchParams.iscsat;

        // ===========================
        // ✅ Remove extra keys
        // ===========================
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;

        let startDate: any = "";
        let endDate: any = "";

        // ✅ call_status is calculated field, so keep it separately
        let callStatusFilter: any = "";


        let populateFields = [{ path: "user", select: "username fullname user_group_uuid", populate: { path: "user_group", select: "name uuid" } }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username ' }, { path: "lead_details", select: 'first_name last_name lead_group_uuid uuid', populate: { path: "lead_group", select: "name uuid" } }, { path: 'telecom_circle', select: 'name uuid -_id' }, { path: "outbound_campaign", select: "name dial_method wrap_up_time" }, { path: "inbound_campaign", select: "name wrap_up_time" }, { path: "blended_campaign", select: "name dial_method wrap_up_time" }, { path: "notes", select: "comment" }, { path: "ivr", select: 'name uuid -_id' }, { path: "call_queue", select: 'name uuid -_id' }];

        // ===========================
        // ✅ Date Filter
        // ===========================
        if (searchParams.callstart != undefined && searchParams.callend != undefined) {
            /* let startDate = moment(new Date(searchParams.callstart)).tz(searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");
             let endDate = moment(new Date(searchParams.callend)).tz(searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");
             console.log("Date",startDate,endDate);
         obj = { "createdAt": { "$gte": `${startDate}`, "$lte": `${endDate}` } };
             where.push(obj);*/
            //  searchParams.timezone = "Asia/Kolkata";
            startDate = moment.tz(searchParams.callstart, searchParams.timezone);
            endDate = moment.tz(searchParams.callend, searchParams.timezone);
            // const utcDate = inputDate.add(5, 'hours');
            //obj = { "createdAt": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
            obj = { "createdAt": { "$gte": `${startDate.toDate()}`, "$lte": `${endDate}` } };
            // obj = { "createdAt": { "$gte": `${startDate.toDate()}`, "$lte": `${endDate}` }, user_uuid: { $ne: "" } };
            where.push(obj);


            objWC = { "createdAt": { '$gte': new Date(startDate.toDate()), '$lte': new Date(endDate) } };
            // objWC = { "createdAt": { '$gte': new Date(startDate.toDate()), '$lte': new Date(endDate) }, user_uuid: { $ne: "" } };
            // objWC = { "callstart": { '$gte': new Date( startDate.toDate() ), '$lte': new Date( endDate ) }, user_uuid: { $ne: "" } };
            whereClause.push(objWC);
        }

        // ===========================
        // ✅ Pagination
        // ===========================
        const perPage = Number(searchParams.limit) || 10;
        const currentPage = Number(searchParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        //End

        delete searchParams.callstart;
        delete searchParams.callend;
        delete searchParams.timezone;
        delete searchParams.page;
        delete searchParams.limit;
        delete searchParams.quarter_selected;
        delete searchParams.quarter_collection_name;

        // ===========================
        // ✅ Build filters dynamically
        // ===========================
        objectKeys = Object.keys(searchParams);
        objectValues = Object.values(searchParams);
        len = objectKeys.length;

        /*if (len == 0) {
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
        }*/

        /* for ( i = 0; i < len; i++ ) {
             filedName = objectKeys[ i ];
             filedValue = objectValues[ i ]; */
        for (let [index, objKey] of objectKeys.entries()) {
            filedName = objKey;
            filedValue = objectValues[index];

            // for regex issue when add a +91 in callerId
            if (typeof filedValue === "string") {
                filedValue = filedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }


            if (filedName.includes("|")) {
                key = filedName.split("|")[0].trim();
                searchFlag = Number.parseInt(filedName.split("|")[1].trim());
            } else {
                key = filedName;
                searchFlag = -1;
            }
            // ✅ call_status is not available in DB, so don't push in Mongo where
            if (key === "call_status") {
                callStatusFilter = filedValue;
                continue;
            }
            if (key === "billsecond") {
                //const [ hours, minutes, seconds ] = filedValue.split( ":" ).map( Number );
                filedValue = Number.parseInt(filedValue);
                // filedValue = Number( filedValue );
                // console.log( typeof filedValue );
            }

            // ✅ Exact match for caller & destination number
            // if (key === "destination_number" || key === "caller_id_number") {
            //     obj = { [key]: filedValue };
            //     where.push(obj);

            //     objWC = { [key]: filedValue };
            //     whereClause.push(objWC);

            //     continue;
            // }

            // ✅ Exact match for caller & destination number — support $or search-- for showing filter for teh swapped value
            if (key === "destination_number" || key === "caller_id_number") {
                // Search in BOTH fields so inbound/outbound display swap doesn't break filtering
                obj = { $or: [{ caller_id_number: filedValue }, { destination_number: filedValue }] };
                where.push(obj);

                objWC = { $or: [{ caller_id_number: filedValue }, { destination_number: filedValue }] };
                whereClause.push(objWC);

                continue;
            }

            // ✅ Exact match for disconnected_by and dial_method
            // if (key === "disconnected_by" || key === "dial_method") {
            //     obj = { [key]: filedValue };
            //     where.push(obj);

            //     objWC = { [key]: filedValue };
            //     whereClause.push(objWC);

            //     continue;
            // }

            switch (searchFlag) {
                case 1: // Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);

                    objWC = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    whereClause.push(objWC);
                    break;

                case 2: // Contains
                    obj = { [key]: { $regex: filedValue, $options: "i" } };
                    where.push(obj);

                    objWC = { [key]: { $regex: filedValue, $options: "i" } };
                    whereClause.push(objWC);
                    break;

                case 3: // Does not contain
                    obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    where.push(obj);

                    objWC = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    whereClause.push(objWC);
                    break;

                case 4: // Is equal to
                    if (key === "billsecond") {
                        obj = { '$expr': { '$eq': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$eq': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else if (Array.isArray(filedValue)) {
                        obj = { [key]: { $in: filedValue } };
                        objWC = { [key]: { $in: filedValue } };
                    } else {
                        obj = { [key]: { $eq: filedValue } };
                        objWC = { [key]: { $eq: filedValue } };
                    }
                    where.push(obj);
                    whereClause.push(objWC);
                    break;

                case 5: // Not equal
                    if (key === "billsecond") {
                        obj = { '$expr': { '$ne': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$ne': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else if (Array.isArray(filedValue)) {
                        obj = { [key]: { $nin: filedValue } };
                        objWC = { [key]: { $nin: filedValue } };
                    } else {
                        obj = { [key]: { $ne: filedValue } };
                        objWC = { [key]: { $ne: filedValue } };
                    }
                    where.push(obj);
                    whereClause.push(objWC);
                    break;

                case 6: // Ends with
                    obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    where.push(obj);

                    objWC = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    whereClause.push(objWC);

                    break;
                case 7: // Greater Than
                    if (key === "billsecond") {
                        obj = { '$expr': { '$gt': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$gt': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else {
                        obj = { [key]: { $gt: filedValue } };
                        objWC = { [key]: { $gt: filedValue } };
                    }
                    where.push(obj);

                    whereClause.push(objWC);
                    break;
                case 8: // Less Than
                    // obj = { [ key ]: { $lt: filedValue } };
                    if (key === "billsecond") {
                        obj = { '$expr': { '$lt': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$lt': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else {
                        obj = { [key]: { $lt: filedValue } };
                        objWC = { [key]: { $lt: filedValue } };
                    }
                    where.push(obj);

                    whereClause.push(objWC);
                    break;
                case 9: // Greater Or Equal Than
                    if (key === "billsecond") {
                        obj = { '$expr': { '$gte': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$gte': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else {
                        obj = { [key]: { $gte: filedValue } };
                        objWC = { [key]: { $gte: filedValue } };
                    }
                    where.push(obj);

                    whereClause.push(objWC);
                    break;
                case 10: // Less Or Equal Than
                    if (key === "billsecond") {
                        obj = { '$expr': { '$lte': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                        objWC = { '$expr': { '$lte': [{ '$toInt': '$' + key }, { '$toInt': filedValue }] } };
                    } else {
                        obj = { [key]: { $lte: filedValue } };
                        objWC = { [key]: { $lte: filedValue } };
                    }
                    where.push(obj);
                    break;

                default: // Default begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);

                    objWC = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    whereClause.push(objWC);
                    break;
            }
        }

        if (where.length == 0) {
            where = [{}];
        }

        if (!searchParams.quarter_selected) {
            searchParams.quarter_selected = 'no';
        }

        if (searchParams.quarter_selected && searchParams.quarter_selected.replace(/\s/g, '') === "yes" &&
            searchParams.quarter_collection_name && searchParams.quarter_collection_name.replace(/\s/g, '') !== ""
        ) {
            Logger.debug(JSON.stringify(searchParams.quarter_collection_name), "Quarterly Collection Name ==> ");

            // Keys to be removed
            const keysToRemove = ['page', 'limit', 'quarter_selected', 'quarter_collection_name', 'timezone'];
            // Remove objects with specified keys
            const filteredWhereClause = whereClause.filter(obj => {
                for (const key of keysToRemove) {
                    if (key in obj) {
                        return false;
                    }
                }
                return true;
            });
            // Logger.log( `CUSTOM - filteredWhereClause ==> ${JSON.stringify( filteredWhereClause )}` );

            let quarterCollectionName = searchParams.quarter_collection_name.replace(/\s/g, '');
            const searchData = await this.cDRSArchieveSearchService.cdrsArchiveSearchData(quarterCollectionName, filteredWhereClause, perPage, skip);
            // Logger.log( `Quarterly searched data length ==> ${searchData.length}` );

            if (searchData.length > 0) {
                count = await this.cDRSArchieveSearchService.cdrsArchiveSearchCount(quarterCollectionName, filteredWhereClause);
                Logger.debug(count, "Search searchData count ==> ");
                return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, searchData, count)
            } else {
                Logger.error(count, "Search searchData count ==> ");
                return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, searchData, count)
            }
        }

        // Fetch all dispositions for caching
        const allDispositions = await this.disposition.find().select({ name: 1, disposition_uuid: 1, parent_disposition: 1 }).lean();
        const dispositionMap = new Map(allDispositions.map(d => [d.disposition_uuid, d]));

        // result = await this.cdrs.find({ $and: where }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).lean().exec();
        result = await this.cdrs.find({ $and: where }).populate(populateFields).sort({ _id: -1 }).lean().exec();

        if (result.length > 0) {
            count = await this.cdrs.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");

            // result?.map((data) => {
            //     data.callstart = moment.tz(new Date(data.callstart + "Z"), searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");
            // })
            result = result.map((doc) => {
                const data = typeof doc.toObject === 'function' ? doc.toObject() : doc; // already a plain object

                // Existing formatting (unchanged)
                if (data.disposition !== "NO_ROUTE_DESTINATION") {
                    data.callstart = moment.tz(new Date(data.callstart + "Z"), searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");
                }

                // ✅ dial_method mapping (string-based)
                if (data?.dial_method !== undefined) {
                    switch (data.dial_method) {
                        case "0":
                            data.dial_method_label = "Manual";
                            break;
                        case "1":
                            data.dial_method_label = "Auto";
                            break;
                        case "2":
                            data.dial_method_label = "Preview";
                            break;
                        case "3":
                            data.dial_method_label = "Predictive";
                            break;
                        default:
                            data.dial_method_label = "Unknown";
                    }
                }

                // ✅ disconnected_by mapping
                // data.disconnected_by_label = data.disconnected_by === "0" ? "Agent" : "Customer";

                const user = Array.isArray(data.user) ? data.user[0] : data.user;

                if (user?.username && user?.fullname) {
                    data.agent = `${user.username} - ${user.fullname}`;
                } else if (user?.username) {
                    data.agent = user.username;
                } else {
                    data.agent = "";
                }

                // Sync path lookup using cache
                const path = this.getDispositionPathSync(dispositionMap, data?.hangup_cause);
                data.hangup_cause = path[0] ?? "-";
                for (let i = 1; i < Math.max(3, path.length); i++) {
                    data[`hangup_cause_${i}`] = path[i] ?? "-";
                }

                // 🔥 ADD THIS BLOCK
                if (data?.destination_number?.includes("_open")) {
                    data.caller_id_number = data?.sip_user ?? data.caller_id_number;
                    data.destination_number = data.destination_number.replace("_open", "");
                }

                // data.billsecond = data.direction == "outbound" ? this.secondsToHHMMSS(data.billsecond) : this.secondsToHHMMSS(Number.parseInt(data.total_duration) - Number.parseInt(data.waiting_time))
                // data.total_duration = this.secondsToHHMMSS(data.total_duration)
                // data.hold_time = this.secondsToHHMMSS(data.hold_time)
                // data.waiting_time = this.secondsToHHMMSS(data.waiting_time)
                // data.ringing_time = this.secondsToHHMMSS(data.ringing_time)

                const rawBillsecond = data.direction == "outbound" ? Number.parseInt(data.billsecond) || 0 : (Number.parseInt(data.total_duration) || 0) - (Number.parseInt(data.waiting_time) || 0);
                const rawHoldTime = Number.parseInt(data.hold_time) || 0;
                const rawWaitingTime = Number.parseInt(data.waiting_time) || 0;
                const rawRingingTime = Number.parseInt(data.ringing_time) || 0;
                // const computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                let computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                if (data.direction === "outbound" && rawBillsecond === 0) {
                    computedTotalDuration = Math.max(Number.parseInt(data.total_duration) || 0, computedTotalDuration);
                }
                const rawCallStatus = data.actual_talktime || 0;
                data.billsecond = this.secondsToHHMMSS(rawBillsecond);
                data.total_duration = this.secondsToHHMMSS(computedTotalDuration);
                data.hold_time = this.secondsToHHMMSS(rawHoldTime);
                data.waiting_time = this.secondsToHHMMSS(rawWaitingTime);
                data.ringing_time = this.secondsToHHMMSS(rawRingingTime);

                // ✅ Add Actual Talk Time
                const direction = String(data.direction || "").toLowerCase();
                const dbActualTalkTime = data.actual_talktime;
                if (direction === "inbound") {
                    data.actual_talktime = this.secondsToHHMMSS(dbActualTalkTime);
                } else {
                    if (String(data.dial_method) === "1") {
                        if (data.user_uuid && String(data.user_uuid).trim() !== "") {
                            data.actual_talktime = data.billsecond;
                        } else {
                            data.actual_talktime = this.secondsToHHMMSS(0);
                        }
                    } else {
                        data.actual_talktime = data.billsecond;
                    }
                }
                // ✅ Final call status logic
                if (direction === "inbound") {
                    data.call_status = Number(rawCallStatus) > 0 ? "Connected" : "Abandoned";
                } else if (direction === "outbound") {
                    data.call_status = data.actual_talktime !== "00:00:00" ? "Connected" : "Not Connected";
                } else {
                    data.call_status = "Not Connected";
                }

                return data;
            });

            // ✅ Apply call_status filter after mapping
            if (callStatusFilter) {
                result = result.filter((item: any) => {
                    const direction = String(item.direction || "").toLowerCase();
                    if (direction === "inbound") { return (["Connected", "Abandoned"].includes(callStatusFilter) && item.call_status === callStatusFilter); }
                    if (direction === "outbound") { return (["Connected", "Not Connected"].includes(callStatusFilter) && item.call_status === callStatusFilter); }
                    return item.call_status === callStatusFilter;
                });
            }

            count = result.length;  // ✅ Total filtered count
            const paginatedResult = result.slice(skip, skip + perPage);
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, paginatedResult, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
        }
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of cdrs with data
    */

    private secondsToHHMMSS(value: any) {
        const seconds = Number(value);

        if (!seconds || isNaN(seconds) || seconds < 0) {
            return "00:00:00";
        }

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [hrs, mins, secs]
            .map(v => String(v).padStart(2, "0"))
            .join(":");
    }

    async findAll(queryParams) {

        console.log("query paraamssss from frontend ", queryParams)

        //add so regex issue not comes based on callerId
        if (queryParams.search) {
            queryParams.search = queryParams.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        //search Term which is being searched
        const searchTerm = queryParams.search;
        let user;
        let disposition;

        if (searchTerm) {
            //search based on user
            user = await this.user.findOne({ username: searchTerm }).lean();
            if (user) {
                // console.log("User who is searcheedd", user)
                queryParams.user_uuid = user.uuid;
                delete queryParams.search;
            } else {
                // search based on hangup cause
                disposition = await this.disposition.findOne({ name: searchTerm }).lean();

                if (disposition) {
                    console.log("disposition on which it is searched", disposition);
                    queryParams.hangup_cause = disposition.disposition_uuid;
                    delete queryParams.search;
                }
            }
        }

        // populate more fields
        let populateFields = [{ path: "user", select: "username fullname user_group_uuid", populate: { path: "user_group", select: "name uuid" } }, { path: "outbound_campaign", select: "name dial_method wrap_up_time" }, { path: "inbound_campaign", select: "name wrap_up_time" }, { path: "blended_campaign", select: "name dial_method wrap_up_time" }, { path: "notes", select: "comment" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name lead_group_uuid uuid', populate: { path: "lead_group", select: "name uuid" } }, { path: "ivr", select: 'name uuid -_id' }, { path: "ringgroup", select: 'name uuid -_id' }, { path: "call_queue", select: 'name uuid -_id' }, { path: 'telecom_circle', select: 'name uuid -_id' }];


        // if (user) {
        //     console.log("user", user)
        //     console.log("query ", queryParams)
        // } else if (disposition) {
        //     console.log("disposition", disposition)
        //     console.log("query ", queryParams)
        // }

        // search on full fields
        let searchFields = ["callstart", "caller_id_name",
            "caller_id_number",
            // "user_uuid", "hangup_cause",
            "campaign_uuid",
            "destination_number", "billsecond", "direction", "disposition"];

        queryParams.tableName = "cdrs";
        const cdrsData = await this.commonDbFn.findAllWithPagination(this.cdrs, queryParams, searchFields, populateFields);
        cdrsData.data = await Promise.all(
            cdrsData.data.map(async (doc) => {
                const item = doc.toObject ? doc.toObject() : doc;
                const path = await this.getDispositionPathNames(
                    this.disposition,
                    // queryParams?.tenant_uuid,
                    item?.hangup_cause,
                    { maxDepth: 50 }
                );

                // path is ROOT -> ... -> CHILD
                // Example for 3 levels: [super, parent, child]
                const baseValue = path[0] ?? "-";
                item.hangup_cause = baseValue;

                // Fill hangup_cause_1, hangup_cause_2, ... up to (n-1)
                for (let i = 1; i < Math.max(3, path.length); i++) {
                    item[`hangup_cause_${i}`] = path[i] ?? "-";
                }

                // 🔥 ADD THIS BLOCK
                if (item?.destination_number?.includes("_open")) {
                    item.caller_id_number = item?.sip_user ?? item.caller_id_number;
                    item.destination_number = item.destination_number.replace("_open", "");
                }

                const rawBillsecond = item?.direction == "outbound" ? Number.parseInt(item?.billsecond) || 0 : (Number.parseInt(item?.total_duration) || 0) - (Number.parseInt(item?.waiting_time) || 0);
                const rawHoldTime = Number.parseInt(item?.hold_time) || 0;
                const rawWaitingTime = Number.parseInt(item?.waiting_time) || 0;
                const rawRingingTime = Number.parseInt(item?.ringing_time) || 0;
                // const computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                let computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                if (item.direction === "outbound" && rawBillsecond === 0) {
                    computedTotalDuration = Math.max(Number.parseInt(item.total_duration) || 0, computedTotalDuration);
                }
                const actual_talktime = (item?.direction === "inbound")
                    ? this.secondsToHHMMSS(item?.actual_talktime)
                    : (String(item?.dial_method) === "1"
                        ? (item?.user_uuid && String(item?.user_uuid).trim() !== "" ? this.secondsToHHMMSS(rawBillsecond) : this.secondsToHHMMSS(0))
                        : this.secondsToHHMMSS(rawBillsecond));

                return {
                    ...item,
                    // billsecond: item?.direction == "outbound" ? this.secondsToHHMMSS(item?.billsecond) : this.secondsToHHMMSS(Number.parseInt(item?.total_duration) - Number.parseInt(item?.waiting_time)),
                    // total_duration: this.secondsToHHMMSS(await item.total_duration),
                    // hold_time: this.secondsToHHMMSS(await item.hold_time),
                    // waiting_time: this.secondsToHHMMSS(await item.waiting_time),
                    // ringing_time: this.secondsToHHMMSS(await item.ringing_time),
                    billsecond: this.secondsToHHMMSS(rawBillsecond),
                    actual_talktime: actual_talktime,
                    call_status:
                        item.direction === "inbound"
                            ? Number(item?.actual_talktime) > 0
                                ? "Connected"
                                : "Abandoned"
                            : item.direction === "outbound"
                                ? actual_talktime !== "00:00:00"
                                    ? "Connected"
                                    : "Not Connected"
                                : "Not Connected",
                    total_duration: this.secondsToHHMMSS(computedTotalDuration),
                    hold_time: this.secondsToHHMMSS(rawHoldTime),
                    waiting_time: this.secondsToHHMMSS(rawWaitingTime),
                    ringing_time: this.secondsToHHMMSS(rawRingingTime),
                };
            })
        );

        console.log("dattttttttttt", cdrsData);
        return cdrsData;

    }

    // Returns names from ROOT -> ... -> CHILD (Sync cache-based)
    private getDispositionPathSync(dispositionMap: Map<any, any>, startUuid: any): string[] {
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
            if (currentUuid === "" || currentUuid == null) break;
        }
        return names.reverse();
    }

    // Returns names from ROOT -> ... -> CHILD (ordered for easy display)
    private getDispositionPathNames = async (
        dispositionModel: any, // mongoose model
        // tenant_uuid: string,
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
                .findOne({ disposition_uuid: currentUuid })
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

    /**************** Agent & Tenant & Admin CDRs Dashboard Section *********************/

    /*
    @Usage                  : To get call data including top 10 records
    @Param loggedInUserInfo : Details of logged in user
    @return Object          : Array of an object with calls data
    */

    async getCallsData(loggedInUserInfo) {

        // console.log( "DATA OF CDRS" );
        // console.log( loggedInUserInfo );
        //Variable declarations
        let response, inboundCalls = 0, outboundCalls: any = 0, answeredCalls = 0, totalCalls = 0, totalBillseconds: any = 0, todayDate, obj = {}, acd, checkRole = {}, top10Records = [];

        todayDate = this.commonFn.getTodayDate();

        //Check Role type
        let { role, tenant_uuid, uuid } = loggedInUserInfo;


        if (role == "tenant") {
            checkRole = { tenant_uuid };
        } else if (role == "agent") {
            checkRole = { user_uuid: uuid };
        }
        //{callstart : { $regex: todayDate, $options: "i" }} == Removed
        // console.log( "DATA OF CDRS1" );
        let populateFields = [{ path: "lead_details", select: "first_name last_name uuid -_id" }];
        response = await this.cdrs.find({ $and: [checkRole] }, { tenant_uuid: 0, trunk_uuid: 0, _id: 0 }).populate(populateFields).sort({ callstart: -1 }).exec();
        // console.log( response );
        // console.log( loggedInUserInfo.timezone );
        // console.log( response[ 0 ].createdAt );
        // console.log( "response" );

        // const startDate = moment.tz( response[ 0 ].createdAt, loggedInUserInfo.timezone );
        // console.log( startDate );
        // console.log( "startDate" );
        totalCalls = response.length;
        response.map((data, i) => {
            // console.log( "SINGLE DATA" );
            //console.log( data );
            // console.log( "createdAtCDRS" + response[ i ].createdAt )
            // console.log( "queryParams.timezoneCDRS" + loggedInUserInfo.timezone )
            response[i].converted_date = moment.tz(response[i].createdAt, loggedInUserInfo.timezone).format("YYYY-MM-DD HH:mm:ss");
            response[i].callstart = moment.tz(new Date(response[i].callstart), loggedInUserInfo.timezone).format("YYYY-MM-DD HH:mm:ss");
            console.log("converted_dateCDRS" + response[i].callstart)
            inboundCalls = data.direction == "inbound" ? inboundCalls + 1 : inboundCalls;
            outboundCalls = data.direction == "outbound" ? outboundCalls + 1 : outboundCalls;
            if (data.billsecond > 0) {
                totalBillseconds = Number.parseInt(totalBillseconds) + Number.parseInt(data.billsecond);
                answeredCalls = answeredCalls + 1;
            }

            //Push only top 10 records
            if (i < 10) {
                top10Records.push(response[i]);
            }
            // console.log( response[ i ].converted_date );
            // console.log( "response" );
        });
        acd = totalBillseconds / answeredCalls;
        obj = totalCalls > 0 ? { totalCalls, inboundCalls, outboundCalls, answeredCalls, acd, top10Records } : "Not Found";
        return this.commonDbFn.sendResponseWithMessage(totalCalls > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, obj);
    }

    async getAgentTodayStats(queryParams) {
        const { uuid, timezone } = queryParams;
        const startDate = moment.tz(timezone).startOf('day').toDate();
        const endDate = moment.tz(timezone).endOf('day').toDate();

        const [total, inbound, outbound] = await Promise.all([
            this.cdrs.countDocuments({ user_uuid: uuid, createdAt: { $gte: startDate, $lte: endDate } }),
            this.cdrs.countDocuments({ user_uuid: uuid, direction: 'inbound', createdAt: { $gte: startDate, $lte: endDate } }),
            this.cdrs.countDocuments({ user_uuid: uuid, direction: 'outbound', createdAt: { $gte: startDate, $lte: endDate } })
        ]);

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, {
            total,
            inbound,
            outbound
        });
    }

    /*
    @Usage                  : To get missed call data of last 10 records
    @Param loggedInUserInfo : Details of logged in user
    @return Object          : Array of an object with missed calls data
    */

    async getMissedCallsData(loggedInUserInfo) {
        let todayDate, checkRole: any = {}, response;
        todayDate = this.commonFn.getTodayDate();
        let populateFields = [{ path: "lead_details", select: "first_name last_name uuid -_id" }];
        //Check Role type
        let { role, tenant_uuid, uuid } = loggedInUserInfo;
        if (role == "tenant") {
            checkRole = { tenant_uuid };
        } else if (role == "agent") {
            checkRole = { user_uuid: uuid };
        }
        //{callstart : { $regex: todayDate, $options: "i" }} == Removed
        response = await this.cdrs.find({ $and: [checkRole, { call_state: "missed" }] }, { user_uuid: 0, extension_uuid: 0, tenant_uuid: 0, trunk_uuid: 0, uuid: 0, _id: 0 }).populate(populateFields).limit(10).sort({ callstart: -1 }).exec();
        return this.commonDbFn.sendResponseWithMessage(response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, response.length > 0 ? response : "Not Found");
    }

    async getIvrGroupData(queryParam) {
        try {
            const { tenant_uuid } = queryParam;
            // Fetch data from IVR, Ring Group, and Call Queue tables based on the UUID
            const ivrData = await this.ivr.find({ tenant_uuid }, { uuid: 1, name: 1 }).exec();
            const ringGroupData = await this.ring_group.find({ tenant_uuid }, { uuid: 1, name: 1 }).exec();
            const callQueueData = await this.call_queue.find({ tenant_uuid }, { uuid: 1, name: 1 }).exec();

            // Structure the output
            const result = {
                ivr: ivrData,
                ringGroup: ringGroupData,
                callQueue: callQueueData,
            };

            // return result;
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
        } catch (error: any) {
            throw new Error(`Error fetching IVR, Ring Group, and Call Queue data: ${error.message}`);
        }
    }

    // async zohoadvancedSearch ( queryParams ) {

    //     console.log("Coming for fetch data");
    //     console.log(queryParams);

    //     let { mobile, phone, zoho_user_id } = queryParams;


    //     let response = await this.cdrs
    //     .find({
    //         $or: [
    //           { destination_number: phone },
    //           { sip_user: phone },
    //           { destination_number: mobile },
    //           { sip_user: mobile },
    //           // Add more conditions if needed
    //         ],
    //         // is_readed: "1",
    //       })
    //    .sort({ callstart: -1 })
    //    .limit(10)
    //    .exec();
    //        // Determining the HTTP status code based on the response length
    //    let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    //        // Returning the response along with the status code
    //    console.log("response");
    //    console.log(response);
    //    return this.commonDbFn.sendResponseWithMessage(statusCode, response);

    // }

    async zohoadvancedSearch(queryParams) {

        // console.log( "Coming for fetch data" );
        // console.log( queryParams );

        let { mobile, phone, tenant_url } = queryParams;
        let or;
        let tenant_response = await this.tenant.find({ domain: tenant_url }).select('uuid').exec();
        // console.log( tenant_response );
        // console.log( tenant_response[ 0 ].uuid )

        if (phone && phone.trim() !== '' && mobile && mobile.trim() !== '') {
            or = [
                { destination_number: phone },
                { sip_user: phone },
                { destination_number: mobile },
                { sip_user: mobile }
            ]
        } else if (phone && phone.trim() !== '' && mobile.trim() == '') {
            or = [
                { destination_number: phone },
                { sip_user: phone }
            ]
        } else if (mobile && mobile.trim() !== '' && phone.trim() == '') {
            or = [
                { destination_number: mobile },
                { sip_user: mobile }
            ]
        }


        let response = await this.cdrs
            .find({
                // $or: [
                //     { destination_number: phone },
                //     { sip_user: phone },
                //     { destination_number: mobile },
                //     { sip_user: mobile },
                // ],
                $or: or,
                $and: [
                    { tenant_uuid: tenant_response[0].uuid }
                ],
                // is_readed: "1",
            })
            .sort({ callstart: -1 })
            .limit(10)
            .exec();
        // Determining the HTTP status code based on the response length
        let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        // Returning the response along with the status code
        // console.log( "response" );
        // console.log( response );
        return this.commonDbFn.sendResponseWithMessage(statusCode, response);

    }
    async checkDispoCount(destinationNumber: any) {
        try {
            //Variable declaration
            let result1, sevenDayConditionCount, oneInThreeDayConditionCount, sevenInSevenDayConditionCount, dispoFlag = 0;

            result1 = await this.cdrs.find({ destination_number: destinationNumber, hangup_cause: { $ne: '' } }, { _id: 0 }).exec();
            sevenDayConditionCount = await this.checkSevenDaysDispo(destinationNumber);
            sevenInSevenDayConditionCount = await this.checkSevenInSevenDaysDispo(destinationNumber);
            oneInThreeDayConditionCount = await this.checkOneInThreeDaysDispo(destinationNumber);
            if (sevenDayConditionCount > 0 || sevenInSevenDayConditionCount > 7 || oneInThreeDayConditionCount > 0) {
                dispoFlag = 1;
            }

            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, dispoFlag, `Dispostion count find successfully`);

        } catch (error) {
            console.error('Error in checkDispoCount:', error);
            throw new Error('Failed to check dispo count');
        }
    }

    async checkSevenDaysDispo(destinationNumber) {
        try {
            const validCodes = ['RPC', 'RPCP', 'PAYM'];
            const dispositionCursor: any = await this.disposition.find({ code: { $in: validCodes } });
            const dispositionUUIDs = dispositionCursor.map(doc => doc.disposition_uuid);
            const dispositionUUIDsSet = new Set(dispositionUUIDs);

            const currentTime = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoISO = moment(sevenDaysAgo).format('YYYY-MM-DD HH:mm:ss');
            const currentTimeISO = moment(currentTime).format('YYYY-MM-DD HH:mm:ss');

            const carsCursor = await this.cdrs.find({
                destination_number: destinationNumber,
                callstart: {
                    $gte: sevenDaysAgoISO,
                    $lte: currentTimeISO,
                },
            });
            let matchingCount = 0;
            carsCursor.forEach(car => {
                if (dispositionUUIDsSet.has(car.hangup_cause)) {
                    matchingCount++;
                }
            });

            return matchingCount;
        } catch (error) {
            console.error('Error in checkSevenDaysDispo:', error);
            throw new Error('Failed to check seven days dispo');
        }
    }

    async checkSevenInSevenDaysDispo(destinationNumber) {
        try {
            const validCodes = ['WNUM', 'LM', 'MNLM', 'NC', 'OPCA'];
            const dispositionCursor: any = await this.disposition.find({ code: { $in: validCodes } });
            const dispositionUUIDs = await dispositionCursor.map(doc => doc.disposition_uuid);
            const dispositionUUIDsSet = new Set(dispositionUUIDs);

            const currentTime = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoISO = moment(sevenDaysAgo).format('YYYY-MM-DD HH:mm:ss');
            const currentTimeISO = moment(currentTime).format('YYYY-MM-DD HH:mm:ss');
            const carsCursor = await this.cdrs.find({
                destination_number: destinationNumber,
                callstart: {
                    $gte: sevenDaysAgoISO,
                    $lte: currentTimeISO,
                },
            });

            let matchingCount = 0;
            carsCursor.forEach(car => {
                if (dispositionUUIDsSet.has(car.hangup_cause)) {
                    matchingCount++;
                }
            });

            return matchingCount;
        } catch (error) {
            console.error('Error in checkSevenInSevenDaysDispo:', error);
            throw new Error('Failed to check seven in seven days dispo');
        }
    }

    async checkOneInThreeDaysDispo(destinationNumber) {
        try {
            const validCodes = ['MACH', 'MDLV', 'MUND'];
            const dispositionCursor: any = await this.disposition.find({ code: { $in: validCodes } });
            const dispositionUUIDs = await dispositionCursor.map(doc => doc.disposition_uuid);
            const dispositionUUIDsSet = new Set(dispositionUUIDs);

            const currentTime = new Date();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const threeDaysAgoPDT = moment(threeDaysAgo).tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss');
            const currentTimePDT = moment(currentTime).tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss');

            const carsCursor = await this.cdrs.find({
                destination_number: destinationNumber,
                callstart: {
                    $gte: threeDaysAgoPDT,
                    $lte: currentTimePDT,
                }
            });
            let matchingCount = 0;
            carsCursor.forEach(car => {
                if (dispositionUUIDsSet.has(car.hangup_cause)) {
                    matchingCount++;
                }
            });

            return matchingCount;
        } catch (error) {
            console.error('Error in checkOneInThreeDaysDispo:', error);
            throw new Error('Failed to check one in three days dispo');
        }
    }

    // CSAT Data-get
    async csatReport(queryParam) {
        try {
            console.log("query from frontend ", queryParam);

            const perPage = Number(queryParam.limit) || 10;
            const currentPage = Number(queryParam.page) || 1;
            const skip = perPage * (currentPage - 1);

            // ✅ tenant_uuid is required
            if (!queryParam.tenant_uuid) {
                return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.BAD_REQUEST,
                    "tenant_uuid is required"
                );
            }

            // ✅ Step 1: tenant filter
            // ✅ Step 2: only ivr feedback score = 9
            const filter: any = {
                tenant_uuid: queryParam?.tenant_uuid,
                ivr_feedback_score: { $exists: true },
            };

            const result = await this.cdrs
                .find(filter)
                // .select(
                //     "ivr_feedback_score tenant_uuid total_duration callstart destination_number direction campaign_uuid user_uuid disposition -_id"
                // )
                .limit(perPage)
                .skip(skip)
                .sort({ _id: -1 })
                .lean()
                .exec();
            const filtered = result.filter(
                (row: any) => row?.ivr_feedback_score !== undefined
            );
            const count = await this.cdrs.countDocuments(filter);
            console.log(result, 'result', count, 'count', filtered, filtered?.length);

            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, filtered, filtered?.length);
        } catch (error: any) {
            Logger.error(error?.message || error, "CSAT_REPORT_ERROR");
            return this.commonDbFn.sendResponseWithMessage(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to fetch CSAT report"
            );
        }
    }


    // ============================================================
    // ✅ CSV STREAMING EXPORT 
    // ============================================================
    async streamAdvancedSearchCsv(searchParams: any, res: any): Promise<void> {
        try {
            let where: any = [];

            // ── Role filter ──────────────────────────────────────────
            const { role, tenant_uuid, uuid } = searchParams;
            if (role === 'tenant') {
                where.push({ tenant_uuid });
            } else if (role === 'agent') {
                where.push({ user_uuid: uuid });
            }

            // ── CSAT filter ──────────────────────────────────────────
            const isCsat = searchParams.only_csat && String(searchParams.only_csat).toLowerCase() === 'yes';
            if (isCsat) {
                where.push({ is_csat: "0" })
            }

            const baseUrl = searchParams.baseUrl ?? '';
            delete searchParams.only_csat;
            delete searchParams.iscsat;
            delete searchParams.tenant_uuid;
            delete searchParams.role;
            delete searchParams.domain;
            delete searchParams.uuid;

            // ── Date filter ──────────────────────────────────────────
            if (searchParams.callstart != null && searchParams.callend != null) {
                const startDate = moment.tz(searchParams.callstart, searchParams.timezone);
                const endDate = moment.tz(searchParams.callend, searchParams.timezone);
                where.push({ createdAt: { $gte: new Date(startDate.toDate()), $lte: new Date(endDate.toDate()) } });
            }

            delete searchParams.callstart;
            delete searchParams.callend;

            // ── Dynamic field filters (same logic as advancedSearch) ──
            const objectKeys = Object.keys(searchParams);
            const objectValues = Object.values(searchParams);

            for (const [index, objKey] of objectKeys.entries()) {
                let filedName = objKey;
                let filedValue: any = objectValues[index];
                let key: string;
                let searchFlag: number;

                if (typeof filedValue === 'string') {
                    filedValue = filedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }

                if (filedName.includes('|')) {
                    key = filedName.split('|')[0].trim();
                    searchFlag = Number.parseInt(filedName.split('|')[1].trim());
                } else {
                    key = filedName;
                    searchFlag = -1;
                }

                if (['page', 'limit', 'timezone', 'quarter_selected', 'quarter_collection_name'].includes(key)) continue;
                if (key === 'destination_number' || key === 'caller_id_number') {
                    where.push({ [key]: filedValue });
                    continue;
                }
                if (key === 'billsecond') filedValue = Number.parseInt(filedValue);

                let obj: any;
                switch (searchFlag) {
                    case 1: obj = { [key]: { $regex: `^${filedValue}`, $options: 'i' } }; break;
                    case 2: obj = { [key]: { $regex: filedValue, $options: 'i' } }; break;
                    case 3: obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: 'i' } }; break;
                    case 4:
                        if (key === 'billsecond') obj = { $expr: { $eq: [{ $toInt: '$' + key }, { $toInt: filedValue }] } };
                        else if (Array.isArray(filedValue)) obj = { [key]: { $in: filedValue } };
                        else obj = { [key]: { $eq: filedValue } };
                        break;
                    case 5:
                        if (key === 'billsecond') obj = { $expr: { $ne: [{ $toInt: '$' + key }, { $toInt: filedValue }] } };
                        else if (Array.isArray(filedValue)) obj = { [key]: { $nin: filedValue } };
                        else obj = { [key]: { $ne: filedValue } };
                        break;
                    case 6: obj = { [key]: { $regex: `${filedValue}$`, $options: 'i' } }; break;
                    case 7: obj = key === 'billsecond' ? { $expr: { $gt: [{ $toInt: '$' + key }, { $toInt: filedValue }] } } : { [key]: { $gt: filedValue } }; break;
                    case 8: obj = key === 'billsecond' ? { $expr: { $lt: [{ $toInt: '$' + key }, { $toInt: filedValue }] } } : { [key]: { $lt: filedValue } }; break;
                    case 9: obj = key === 'billsecond' ? { $expr: { $gte: [{ $toInt: '$' + key }, { $toInt: filedValue }] } } : { [key]: { $gte: filedValue } }; break;
                    case 10: obj = key === 'billsecond' ? { $expr: { $lte: [{ $toInt: '$' + key }, { $toInt: filedValue }] } } : { [key]: { $lte: filedValue } }; break;
                    default: obj = { [key]: { $regex: `^${filedValue}`, $options: 'i' } }; break;
                }
                where.push(obj);
            }

            if (where.length === 0) where = [{}];

            // ── Disposition cache ────────────────────────────────────
            const allDispositions = await this.disposition.find().select({ name: 1, disposition_uuid: 1, parent_disposition: 1 }).lean();
            const dispositionMap = new Map(allDispositions.map((d: any) => [d.disposition_uuid, d]));

            const timezone = searchParams.timezone || 'UTC';

            const populateFields: any = [
                { path: 'user', select: 'username fullname user_group_uuid', populate: { path: 'user_group', select: 'name uuid' } },
                { path: 'extension', select: 'username' },
                { path: 'tenant', select: 'tenant_name username' },
                { path: 'lead_details', select: 'first_name last_name lead_group_uuid uuid', populate: { path: 'lead_group', select: 'name uuid' } },
                { path: 'telecom_circle', select: 'name uuid -_id' },
                { path: 'outbound_campaign', select: 'name dial_method wrap_up_time' },
                { path: 'inbound_campaign', select: 'name wrap_up_time' },
                { path: 'blended_campaign', select: 'name dial_method wrap_up_time' },
                { path: 'notes', select: 'comment' },
                { path: 'ivr', select: 'name' },
            ];

            // ── CSV headers ──────────────────────────────────────────
            let CSV_HEADERS = [
                'Start Date', 'End Date', 'Caller Id Number', 'Phone Number',
                'User ID', 'Full Name', 'User Group Name', 'IVR Name', 'Agent', 'Duration', 'Answer Time', 'Actual Talk Time',
                'Call Status', 'Hold Time', 'Waiting Time', 'Ringing Time', 'Campaign',
                'Lead Group Name', 'Dial Method', 'Disconnected By',
                'Disposition', 'Sub Disposition 1', 'Sub Disposition 2',
                'Direction', 'CSAT Score', 'Comment', 'Recording Path'
            ];
            if (isCsat) {
                CSV_HEADERS = [
                    'Start Date', 'End Date', 'Caller Id Number', 'Phone Number',
                    'User ID', 'Full Name', 'User Group Name', 'IVR Name', 'Agent', 'Duration', 'Call Status', 'Campaign',
                    'Lead Group Name', 'CSAT Score', 'Disconnected By',
                    'Disposition', 'Sub Disposition 1', 'Sub Disposition 2',
                    'Direction', 'Comment', 'Recording Path'
                ];
            }

            const escCsv = (val: any) => {
                if (val == null) return '';
                const s = String(val);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                    ? `"${s.replace(/"/g, '""')}"` : s;
            };

            const dialMethodLabel = (m: string) =>
                ({ '0': 'Manual', '1': 'Auto', '2': 'Preview', '3': 'Predictive' }[m] ?? '');

            const disconnectedByLabel = (d: string) =>
                ({ '0': 'Agent', '1': 'Customer', '2': 'Automatic' }[d] ?? '');

            // ── Stream response ─────────────────────────────────────
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="CDRs.csv"');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');

            // Write BOM for Excel UTF-8 compatibility + header row
            res.write('\uFEFF' + CSV_HEADERS.map(escCsv).join(',') + '\r\n');

            // ── Batch fetch ──────────────────────────────────────────
            const BATCH = 500;
            let skip = 0;
            let fetched = 0;

            while (true) {
                const batch = await this.cdrs
                    .find({ $and: where })
                    .sort({ _id: -1 })
                    .skip(skip)
                    .limit(BATCH)
                    .populate(populateFields)
                    .lean()
                    .exec();

                if (!batch || batch.length === 0) break;
                fetched += batch.length;

                for (const doc of batch) {
                    const data: any = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;

                    const callstart = data.disposition !== "NO_ROUTE_DESTINATION" ? data.callstart
                        ? moment.tz(new Date(data.callstart + 'Z'), timezone).format('YYYY-MM-DD HH:mm:ss')
                        : '' : data.callstart;

                    const path = this.getDispositionPathSync(dispositionMap, data?.hangup_cause);

                    const user = Array.isArray(data.user) ? data.user[0] : data.user;
                    let agentLabel = 'vdad';
                    if (user?.username && user?.fullname) agentLabel = `${user.username} - ${user.fullname}`;
                    else if (user?.username) agentLabel = user.username;

                    const campaign =
                        data.outbound_campaign?.[0]?.name ||
                        data.inbound_campaign?.[0]?.name ||
                        data.blended_campaign?.[0]?.name || '';

                    const leadGroupName = data.lead_details?.[0]?.lead_group?.[0]?.name || '';
                    const userGroupName = user?.user_group?.[0]?.name || user?.user_group?.name || '';
                    const comment = data.custom_callid !== "" ? data.notes?.[0]?.comment : '';
                    const ivr_name = data?.ivr?.[0]?.name;

                    // const billsecond = data.direction === 'outbound'
                    //     ? this.secondsToHHMMSS(data.billsecond)
                    //     : this.secondsToHHMMSS(parseInt(data.total_duration) - parseInt(data.waiting_time));
                    const rawBillsecond = data.direction === 'outbound' ? Number.parseInt(data.billsecond) || 0 : (Number.parseInt(data.total_duration) || 0) - (Number.parseInt(data.waiting_time) || 0);
                    const rawHoldTime = Number.parseInt(data.hold_time) || 0;
                    const rawWaitingTime = Number.parseInt(data.waiting_time) || 0;
                    const rawRingingTime = Number.parseInt(data.ringing_time) || 0;
                    //const computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                    let computedTotalDuration = rawWaitingTime + rawRingingTime + rawHoldTime + rawBillsecond;
                    if (data.direction === "outbound" && rawBillsecond === 0) {
                        computedTotalDuration = Math.max(Number.parseInt(data.total_duration) || 0, computedTotalDuration);
                    }

                    // 🔥 ADD THIS BLOCK
                    if (data?.destination_number?.includes("_open")) {
                        data.caller_id_number = data?.sip_user ?? data.caller_id_number;
                        data.destination_number = data.destination_number.replace("_open", "");
                    }

                    // Swap for Inbound before building CSV row
                    let caller_id_number_val = data.caller_id_number;
                    let destination_number_val = data.destination_number;
                    const isI = data.direction?.toString().toLowerCase().includes("inbound");
                    if (isI) {
                        caller_id_number_val = data.destination_number;
                        destination_number_val = data.caller_id_number;
                    }
                    const actual_talktime = (data.direction === 'inbound') ? this.secondsToHHMMSS(data.actual_talktime) : (String(data.dial_method) === "1"
                        ? (data.user_uuid && String(data.user_uuid).trim() !== "" ? this.secondsToHHMMSS(rawBillsecond) : this.secondsToHHMMSS(0))
                        : this.secondsToHHMMSS(rawBillsecond));
                    const call_status =
                        data.direction === "inbound"
                            ? Number(data?.actual_talktime) > 0
                                ? "Connected"
                                : "Abandoned"
                            : data.direction === "outbound"
                                ? actual_talktime !== "00:00:00"
                                    ? "Connected"
                                    : "Not Connected"
                                : "Not Connected";

                    const recording_path = data?.recording_path ? `${baseUrl}/recordings/download/recording?recording=` + data?.recording_path : "";

                    let row = [
                        callstart,
                        data.callend || '',
                        caller_id_number_val || '',
                        destination_number_val || '',
                        user?.username || '',
                        user?.fullname || '',
                        userGroupName,
                        ivr_name,
                        agentLabel,
                        // this.secondsToHHMMSS(data.total_duration),
                        // billsecond,
                        // this.secondsToHHMMSS(data.hold_time),
                        // this.secondsToHHMMSS(data.waiting_time),
                        // this.secondsToHHMMSS(data.ringing_time),
                        this.secondsToHHMMSS(computedTotalDuration),
                        this.secondsToHHMMSS(rawBillsecond),
                        actual_talktime,
                        call_status,
                        this.secondsToHHMMSS(rawHoldTime),
                        this.secondsToHHMMSS(rawWaitingTime),
                        this.secondsToHHMMSS(rawRingingTime),
                        campaign,
                        leadGroupName,
                        dialMethodLabel(data.dial_method),
                        disconnectedByLabel(data.disconnected_by),
                        path[0] ?? '',
                        path[1] ?? '',
                        path[2] ?? '',
                        data.direction || '',
                        data.ivr_feedback_score || '-',
                        comment,
                        recording_path
                    ].map(escCsv).join(',');

                    if (isCsat) {
                        row = [
                            callstart,
                            data.callend || '',
                            caller_id_number_val || '',
                            destination_number_val || '',
                            user?.username || '',
                            user?.fullname || '',
                            userGroupName,
                            ivr_name,
                            agentLabel,
                            // this.secondsToHHMMSS(data.total_duration),
                            // billsecond,
                            // this.secondsToHHMMSS(data.hold_time),
                            // this.secondsToHHMMSS(data.waiting_time),
                            // this.secondsToHHMMSS(data.ringing_time),
                            this.secondsToHHMMSS(computedTotalDuration),
                            call_status,
                            // this.secondsToHHMMSS(rawBillsecond),
                            // this.secondsToHHMMSS(rawHoldTime),
                            // this.secondsToHHMMSS(rawWaitingTime),
                            // this.secondsToHHMMSS(rawRingingTime),
                            campaign,
                            leadGroupName,
                            data?.ivr_feedback_score || '-',
                            // dialMethodLabel(data.dial_method),
                            disconnectedByLabel(data.disconnected_by),
                            path[0] ?? '',
                            path[1] ?? '',
                            path[2] ?? '',
                            data.direction || '',
                            comment,
                            recording_path
                        ].map(escCsv).join(',');
                    }

                    res.write(row + '\r\n');
                }

                Logger.debug(`CSV export: wrote batch of ${batch.length} (total so far: ${fetched})`);
                skip += BATCH;
                if (batch.length < BATCH) break; // last batch
            }

            res.end();
            Logger.log(`CSV export complete: ${fetched} records`);
        } catch (error: any) {
            Logger.error(`CSV export error: ${error?.message}`, error?.stack);
            if (!res.headersSent) {
                res.status(500).json({ message: 'CSV export failed', error: error?.message });
            } else {
                res.end();
            }
        }
    }

}
