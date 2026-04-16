import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { VoicebroadcastdetailsDocument, VoicebroadcastdetailsSchema } from "../schema/voicebroadcast-details.schema";
import { getMethod } from "src/global_constant";
import { IvrDocument, IvrSchema } from "src/modules/ivr/schema/ivr.schema";
import { RinggroupDocument, RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { CallQueueDocument, CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";

@Injectable()
export class VoicebroadcastdetailsService {

    /*
    @Usage              : To load cdrs schema and other libraries
    @Param @InjectModel : It will load cdrs schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [cdrs,commonDbFn]
    */

    constructor(
        @InjectModel(VoicebroadcastdetailsSchema.name) private readonly voicebroadcast_details: Model<VoicebroadcastdetailsDocument>,
        @InjectModel(IvrSchema.name) private readonly ivr: Model<IvrDocument>,
        @InjectModel(RinggroupSchema.name) private readonly ring_group: Model<RinggroupDocument>,
        @InjectModel(CallQueueSchema.name) private readonly call_queue: Model<CallQueueDocument>,
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

        //Check Role type
        let { role, tenant_uuid, uuid } = searchParams;
        if (role == "tenant") {
            where.push({ tenant_uuid: tenant_uuid });
        } else if (role == "agent") {
            where.push({ user_uuid: uuid });
        }
        //Delete unnecessary details from request
        // if (searchParams.role == "master_admin" || searchParams.role == "tenant" || searchParams.role == "agent") {
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;
        // }

        let populateFields = [{ path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name uuid -_id' }, { path: "voice_broadcast", select: 'name uuid -_id' }, { path: "disposition", select: "name hangup_cause -_id" }];
        if (searchParams.start_date != undefined && searchParams.end_date != undefined) {
            obj = {
                callstart: {
                    $gte: searchParams.start_date,  // "2026-03-25 00:00:00"
                    $lte: searchParams.end_date     // "2026-03-25 23:59:59"
                }
            };
            where.push(obj);
        }

        //Pagination
        const perPage = Number(searchParams.limit) || 10;
        const currentPage = Number(searchParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        //End

        delete searchParams.callstart;
        delete searchParams.callend;


        objectKeys = Object.keys(searchParams);
        objectValues = Object.values(searchParams);
        len = objectKeys.length;

        /*if (len == 0) {
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
        }*/

        for (i = 0; i < len; i++) {
            filedName = objectKeys[i];
            filedValue = objectValues[i];
            if (filedName.includes("|")) {
                key = filedName.split("|")[0].trim();
                searchFlag = parseInt(filedName.split("|")[1].trim());
            } else {
                key = filedName;
                searchFlag = -1;
            }

            switch (searchFlag) {
                case 1: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
                case 2: // Contains
                    obj = { [key]: { $regex: filedValue, $options: "i" } };
                    where.push(obj);
                    break;
                case 3: // Does not contains
                    obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    where.push(obj);
                    break;
                case 4: // Is equal to
                    obj = { [key]: filedValue };
                    where.push(obj);
                    break;
                case 5: // In not equal to
                    obj = { [key]: { $ne: filedValue } };
                    where.push(obj);
                    break;
                case 6: //Ends with
                    obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    where.push(obj);
                    break;

                default: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
            }
        }

        if (where.length == 0) {
            where = {};
        }
        result = await this.voicebroadcast_details.find({ $and: where }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).exec();

        if (result.length > 0) {
            count = await this.voicebroadcast_details.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
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

    async findAll(queryParams) {
        let populateFields = [{ path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name uuid -_id' }, { path: "voice_broadcast", select: 'name uuid -_id' }, { path: "disposition", select: "name hangup_cause -_id" }];
        let searchFields = ["callstart", "destination_number", "total_duratio", "ringing_time", "billsecond", "duration", "dtmf"];
        queryParams.tableName = "vb_details";
        return this.commonDbFn.findAllWithPagination(this.voicebroadcast_details, queryParams, searchFields, populateFields);
    }

    /*

     @Usage          : To get single Voicebroadcast details record based on uuid

     @Param uuid     : Search Voicebroadcast details by uuid

     @return Object  : Result of Voicebroadcast details

     */



    async findOne(uuid: string) {

        let logMessages = {

            logErrorMsg: `Voicebroadcast details not found by uuid : ${uuid} \n`,

            logSuccessMsg: `Voicebroadcast details success fetched by uuid : ${uuid} \n`

        }
        console.log("uuid", uuid);
        const result = await this.voicebroadcast_details.findOne({ voicebroadcast_uuid: uuid }).sort({ _id: -1 }).exec();
        const res = logMessages;
        if (result == null) {
            Logger.error(res.logErrorMsg, getMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
        //  return this.commonDbFn.findOne(this.voicebroadcast_details, uuid, JSON.stringify(logMessages));

    }
}
