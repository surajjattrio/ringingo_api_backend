import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { deleteMethod, getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonFunctions } from "./common_functions";
import { InjectModel } from "@nestjs/mongoose";
import { ManagerRoleDocument, ManagerRoleSchema } from "../manager-role/schema/manager-role.schema";
import { Model } from "mongoose";
import * as moment from 'moment-timezone';
import { ManagerDocument, ManagerSchema } from "../manager/schema/manager.schema";

@Injectable()
export class CommonDBFunctions {
    constructor(
        private readonly commonFn: CommonFunctions,
        @InjectModel(ManagerRoleSchema.name) private readonly manager_role: Model<ManagerRoleDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>
    ) { }

    /*
    @Usage                 : To get single record with multiple condition
    @Param collection_name : schema[tableName]
    @Param where           : where condition to find
    */

    async selectOne(collection_name, where) {
        return await collection_name.findOne({ $or: [{ username: where }, { email: where }] }).exec();
    }

    /*
    @Usage                 : Check given data is unique or not , if given data already exist it will throw error else new record will be inserted
    @Param collection_name : schema[tableName]
    @Param where           : object or array of an object[Depend on business logic]
    @Param insertData      : Data to insert into DB.
    @Param logMessage      : object with error & success message
    @Param findType        : Type of condition[one(default) - it will check for single where , or - it will check for multiple where with or condition, and - it will check for multiple where with and condition]
    @return Object         : Success / Error
    */

    async findAndInsert(collection_name, where: any, insertData, logMessage, findType = "one", retrieve_inserted_data = false) {
        let queryResult;
        const res = JSON.parse(logMessage);
        switch (findType) {
            case "or":
                queryResult = await collection_name.findOne({ $or: where }).count().exec();
                break;
            case "and":
                queryResult = await collection_name.findOne({ $and: where }).count().exec();
                break;
            case "and_with_or":
                queryResult = await collection_name.findOne({ $and: [{ $or: where.andQuery }, { $or: where.orQuery }] }).count().exec();
                break;
            default:
                queryResult = await collection_name.findOne(where).count().exec();
                break;
        }

        if (queryResult > 0) {
            Logger.error(res.logErrorMsg, postMethod);
            res.logErrorMsg = res.logErrorMsg.replace("\n", "").trim();
            return this.sendResponseWithMessage(HttpStatus.CONFLICT, res.logErrorMsg);
        }

        const result = new collection_name(insertData);
        await result.save();
        res.logSuccessMsg = res.logSuccessMsg.replace("\n", "").trim();
        Logger.debug(res.logSuccessMsg);

        if (retrieve_inserted_data) {
            return this.sendResponseWithMessage(HttpStatus.CREATED, res.logSuccessMsg, result);
        }

        return this.sendResponseWithMessage(HttpStatus.CREATED, res.logSuccessMsg);
    }



    async findoneandupdate(collection_name, where: object, updatedata, logMessage, upsert) {
        let queryresult;
        const res = JSON.parse(logMessage);

        queryresult = await collection_name.findOneAndUpdate(where, updatedata, upsert);
        res.logSuccessMsg = res.logSuccessMsg.replace("\n", "").trim();
        Logger.debug(res.logSuccessMsg);

        return this.sendResponseWithMessage(HttpStatus.CREATED, queryresult, res.logSuccessMsg)


    }

    /*
    @Usage                 : To insert new record in DB.
    @Param collection_name : schema[tableName]
    @Param insertData      : Data to insert into DB.
    @Param logMessage      : object with error & success message
    @return Object         : Success / Error
    */

    async insert(collection_name, insertData, logMessage, retrieve_inserted_data = false) {
        const res = JSON.parse(logMessage);
        const result = new collection_name(insertData);
        await result.save();
        res.logSuccessMsg = res.logSuccessMsg.replace("\n", "").trim();
        Logger.debug(res.logSuccessMsg);
        if (retrieve_inserted_data) {
            return this.sendResponseWithMessage(HttpStatus.CREATED, res.logSuccessMsg, result);
        }
        return this.sendResponseWithMessage(HttpStatus.CREATED, res.logSuccessMsg);
    }

    /*
    @Usage                 : Get all records
    @Param collection_name : schema[tableName]
    @return Object         : Array of an object with total count and data
    */

    /*async findAll(collection_name) {
        let result = await collection_name.aggregate([
            {
                $facet: {
                    count: [{ $count: "total" }],
                    data: [{ $match: {} }],
                }
            },
            {
                $unwind: "$count"
            },
        ]);
        return this.sendResponseWithMessage(HttpStatus.OK, result);
    }*/

    async findAll(collection_name, uuid: any, logMessage, projection: any = "") {
        const result = await collection_name.find(uuid, projection).exec();
        const res = JSON.parse(logMessage);
        if (result == null) {
            Logger.error(res.logErrorMsg, getMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        return this.sendResponseWithMessage(HttpStatus.OK, result);
    }

    /*
    @Usage                 : To insert new record in DB.
    @Param collection_name : schema[tableName]
    @Param where           : where condition to delete record
    @Param logMessage      : object with error & success message
    @return Object         : Success / Error
    */

    async delete(collection_name, where, logMessage) {
        let uuids = where.uuid.split(",");
        const res = JSON.parse(logMessage);
        const result = await collection_name.deleteMany({ uuid: { $in: uuids } }).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if (result.deletedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.sendResponseWithCount(HttpStatus.NOT_FOUND, res.logErrorMsg, deletedCount);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.sendResponseWithCount(HttpStatus.OK, res.logSuccessMsg, deletedCount);
    }

    /*
    @Usage            : To update status
    @Param uuid       : uuid refer to which record you need to update
    @Param body       : update data that comes in body
    @return Object    : Success / Error
    */

    async update(collection_name, uuid: string, body, logMessage) {
        const result = await collection_name.updateOne({ uuid }, body).exec();
        const res = JSON.parse(logMessage);
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    }

    /*
    @Usage            : To update status
    @Param where      : where condition to which record you need to update
    @Param body       : update data that comes in body
    @return Object    : Success / Error
    */

    async updateByStatus(collection_name, where, body, logMessage) {
        let uuids = where.uuid.split(",");
        const result = await collection_name.updateMany({ uuid: { $in: uuids } }, body).exec();
        const res = JSON.parse(logMessage);
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    }

    /*
    @Usage                    : To search on parameters receive in searchParams
    @Param collection_name    : schema[tableName]
    @Param searchParams       : Search data will receive in this param
    @return                   : Array of an object with total count of tenants with data
    */

    async advancedSearch(collection_name, searchParams, populate: any = "") {
        let i, count = 0, showAssignedListToManager;
        let where: any = [];
        let tablename = searchParams.tableName;

        //Check Role type
        let { role, tenant_uuid, uuid, assigned_manager_role, module, timezone } = searchParams;
        if (role == "tenant") {
            where.push({ tenant_uuid: tenant_uuid });
        } else if (role == "agent") {
            where.push({ user_uuid: uuid });
        }

        if (role == "manager") {
            where.push({ tenant_uuid });
            showAssignedListToManager = await this.getManagerRoleInfo(assigned_manager_role, module);
        }

        //Delete unnecessary details from request
        //if (searchParams.role == "master_admin" || searchParams.role == "tenant" || searchParams.role == "agent") {
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;
        delete searchParams.tableName;
        delete searchParams.timezone;
        delete searchParams.concurrent_calls;
        delete searchParams.manager_uuid;
        delete searchParams.assigned_manager_role;
        delete searchParams.module;
        delete searchParams.parent_uuid;
        delete searchParams.page;
        delete searchParams.limit;
        // }

        var objectKeys = Object.keys(searchParams);
        var objectValues = Object.values(searchParams);
        var len = objectKeys.length;
        /*if (len == 0) {
            return this.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
        }*/

        let filedName, filedValue, searchFlag, key, obj;
        // for (i = 0; i < len; i++) {
        for (let [index, objKey] of objectKeys.entries()) {
            //filedName = objectKeys[i];
            //filedValue = objectValues[i];
            filedName = objKey;
            filedValue = objectValues[index];

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

        if (where.length == 0) { where = [{}]; }
        if (role == "manager" && showAssignedListToManager != "") {
            where.push({ $or: [{ tenant_uuid }, { uuid: { $in: showAssignedListToManager } }] });
        }
        const result = await collection_name.find({ $and: where }).populate(populate).exec();

        if (tablename && tablename == 'trunk') {
            let register_array = [], unregister_array = [];
            register_array = await this.commonFn.get_register_flag();
            // register_array = register_flag.body.trim().split( ' ' );

            unregister_array = await this.commonFn.get_unregister_flag();
            // unregister_array = unregister_flag.body.trim().split( ' ' );
            if (result != '') {
                result?.map((data) => {
                    // console.log( data[ 'name' ] )
                    if (data['name'] != '') {
                        // console.log( 'coming' );
                        // console.log( data );
                        if (register_array.includes(data['name'])) {
                            // console.log( 'registered' );
                            data['register_flag'] = 0;
                        } else if (unregister_array.includes(data['name'])) {
                            // console.log( 'unregisterd' );
                            data['register_flag'] = 1;
                            // data.push( { 'register_flag': 1 } );
                        }
                    }
                })
                // console.log( "RESULT" );
                // console.log( result );

            }
        }
        // const count = await collection_name.find({ $and: where }).count().exec();
        searchParams.timezone = timezone;
        if (result.length > 0) {
            count = await collection_name.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");
            return this.sendResponseWithCount(HttpStatus.OK, result, count)
        } else {
            Logger.error(count, "Search result count");
            return this.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
        }
    }

    /*
    @Usage                 : Common method to get records based on limit,page,search
    @Param collection_name : schema[tableName]
    @Param queryParams     : It will contain page(default=1),limit(default=10),search
    @Param searchFields    : Array of filter fields
    @Param populate        : To populate reference data of another table
    @return                : Array of an object with total count with data
    */

    async findAllWithPagination(collection_name, queryParams, searchFields: any = "", populate: any = "", sort: any = { _id: -1 }, pagination = true, getTenantDataForAgent = false) {
        let searchParams = [], query: any = {}, checkRole: any = {}, filterDate: any = {}, result, totalCount = 0, showAssignedListToManager, tenatUUIDs = [];
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);

        //Send all data
        /*if (queryParams.limit == undefined && queryParams.page == undefined) {
            pagination = false;
        }else if(queryParams.list == "all"){
            pagination = false;
        }*/


        // FIX FOR USER & DISPOSITION SEARCH)
        if (queryParams.user_uuid) {
            query.user_uuid = queryParams.user_uuid;
        }

        if (queryParams.hangup_cause) {
            query.hangup_cause = queryParams.hangup_cause;
        }

        if (queryParams.pbx_feature) {
            query.pbx_feature = queryParams.pbx_feature;
        }

        if (queryParams.status !== undefined) {
            query.status = queryParams.status;
        }

        if ((((!queryParams.limit) || (queryParams.limit && queryParams.limit == "")) && ((!queryParams.page) || (queryParams.page && queryParams.page == ""))) || (queryParams.list && queryParams.list == "all")) {
            pagination = false;
        }

        // Initialize query object
        if (!query) {
            query = {};
        }

        // Add call_state filter based on callstate parameter
        if (queryParams.callstate == "drop") {
            query.call_state = "drop";
        } else if (queryParams.callstate == "normal") {
            query.call_state = "normal";
        } else if (queryParams.callstate == "missed") {
            query.call_state = "missed";
        } else if (queryParams.callstate == "call-queue") {
            // query.call_state = "call-queue";
            query.call_state = "missed";
            query.pbx_feature = "call-queue";
            query.direction = "inbound";
        }

        //Check search parameters
        if (queryParams.search != "" && queryParams.search != undefined && searchFields != "") {
            searchFields.map((data) => {
                searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } })
            })

            // custom search for lead_management_unique
            if (queryParams.tableName === "lead_management_unique") {
                searchParams.push(
                    { first_name: { $regex: queryParams.search, $options: 'i' } },
                    { phone_number: { $regex: queryParams.search, $options: 'i' } },
                    { custom_phone_number: { $regex: queryParams.search, $options: 'i' } },
                    { "custom_fields.user_code": { $regex: queryParams.search, $options: 'i' } }
                );
            }

            // Combine search with existing query
            if (Object.keys(query).length > 0) {
                query = { '$and': [{ '$or': searchParams }, query] };
            } else {
                query = { '$or': searchParams };
            }
        }
        //Check Role type
        let { role, tenant_uuid, uuid, assigned_manager_role, module, manager_uuid, parent_uuid } = queryParams;

        //Get tenant data for agent portal
        if (getTenantDataForAgent && role == "agent") {

            checkRole = { tenant_uuid, status: "0" };
            //if(manager_uuid != "" && manager_uuid != undefined) role = "manager"; // Allow agent of manager to use created resource by there manager
        } else {
            //Get data based on role
            if (role == "tenant") {
                //checkRole = { tenant_uuid };
                let result = await this.fetchAllManagersOfTenant(tenant_uuid);
                result.push(tenant_uuid);
                checkRole = { tenant_uuid: { $in: result } }
            } else if (role == "agent" && queryParams.tableName !== "unallocated_leads") {
                checkRole = { user_uuid: uuid };
            }
            else if (role == "agent" && queryParams.tableName == "unallocated_leads") {
                checkRole = { user_uuid: { $exists: false }, tenant_uuid: tenant_uuid };
            }
        }

        // ✅ ADDED: For lead_management_unique, if search contains phone_number or custom_phone_number,
        // override checkRole to search across all agents under the tenant.
        // If uuid is also provided, it is already reflected in the search query above (via user_uuid in query).
        // This allows cross-agent phone number search while keeping uuid-based filtering optional.
        if (
            queryParams.tableName === "lead_management_unique" &&
            queryParams.search != "" &&
            queryParams.search != undefined
        ) {
            const isPhoneSearch = /^\d+$/.test(queryParams.search.trim()); // pure numeric = phone number search
            if (isPhoneSearch) {
                // Relax checkRole to tenant scope so leads dialed by other agents are also returned
                checkRole = { tenant_uuid };

                // If uuid is provided, include it as an optional filter alongside tenant search
                // i.e., show all phone-matched leads in tenant, not just this agent's
                // (uuid presence is already optional — no additional filter needed here)
            }
        }

        Logger.debug(`Fetching data from role : ${role} with ${JSON.stringify(checkRole)}`);

        //Check tableName here, if it is cdrs then display only today call records
        if (queryParams.tableName == "cdrs" || queryParams.tableName == "recording" || queryParams.tableName == "vb_details" || queryParams.tableName == "drop_calls" || queryParams.tableName == "missed_calls") {
            filterDate = { callstart: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }
        }

        if (queryParams.callstate == "drop") {
            filterDate = { callstart: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }
        }

        if (queryParams.callstate == "call-queue") {
            filterDate = { callstart: { '$regex': this.commonFn.getTodayDate(), '$options': 'i' } }
        }

        //Check sorting flag
        if (sort != "") {
            sort = sort;
        }

        //Fetch roles details
        if (role == "manager") {
            checkRole = module == "user" ? { manager_uuid: manager_uuid } : { tenant_uuid };
            showAssignedListToManager = await this.getManagerRoleInfo(assigned_manager_role, module);

            //Allow listing of other modules directly to manager if not exist in getManagerRoleInfo
            if (showAssignedListToManager == "") tenatUUIDs.push(tenant_uuid, parent_uuid);
        }


        //Check pagination flag
        if (pagination) {
            if (filterDate.callstart !== undefined) { // for cdrs only
                result = await collection_name.find({ $and: [query, checkRole, filterDate] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
            } else if (query.call_state !== undefined) {
                result = await collection_name.find({ $and: [query, checkRole, filterDate] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();

            } else {
                if (role == "manager") {
                    // result = await collection_name.find({ $or: [{ tenant_uuid }, { uuid: { $in: showAssignedListToManager } }] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                    if (showAssignedListToManager != "") {
                        let condition = module == "user" ? { manager_uuid: manager_uuid } : { tenant_uuid }
                        result = await collection_name.find({ $and: [query, { $or: [condition, { uuid: { $in: showAssignedListToManager } }] }] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                    } else {
                        //result = await collection_name.find({ $and: [query, checkRole] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                        result = await collection_name.find({ $and: [query, { $or: [{ tenant_uuid: { $in: tenatUUIDs } }] }] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                        // result = await collection_name.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: tenatUUIDs } } ] } ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( sort ).exec();
                    }
                } else {
                    result = await collection_name.find({ $and: [query, checkRole] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                }
            }
        } else {
            if (queryParams.list == "all") { //For dropdown's usage
                if (role == "manager") {
                    if (showAssignedListToManager != "") {
                        let condition = module == "user" ? { manager_uuid: manager_uuid } : { tenant_uuid }
                        result = await collection_name.find({ $or: [condition, { uuid: { $in: showAssignedListToManager } }] }).sort(sort).exec();
                    } else {
                        //result = await collection_name.find({ $and: [query, checkRole] }).sort(sort).exec();
                        result = await collection_name.find({ $and: [query, { $or: [{ tenant_uuid: { $in: tenatUUIDs } }] }] }).sort(sort).exec();
                    }
                } else {
                    result = await collection_name.find({ $and: [query, checkRole] }).sort(sort).exec();
                }
            } else {
                if (role == "manager") {
                    if (showAssignedListToManager != "") {
                        let condition = module == "user" ? { manager_uuid: manager_uuid } : { tenant_uuid }
                        result = await collection_name.find({ $or: [condition, { uuid: { $in: showAssignedListToManager } }] }, { _id: 0, tenant_name: 1, username: 1, name: 1, uuid: 1, country: 1, role_name: 1, status: 1, state_name: 1, code: 1, state_code: 1 }).sort(sort).exec();
                    } else {
                        //result = await collection_name.find({ $and: [query, checkRole] }).limit(perPage).skip(skip).populate(populate).sort(sort).exec();
                        result = await collection_name.find({ $and: [query, { $or: [{ tenant_uuid: { $in: tenatUUIDs } }] }] }, { _id: 0, tenant_name: 1, username: 1, name: 1, uuid: 1, country: 1, role_name: 1, status: 1, state_name: 1, code: 1, state_code: 1 }).sort(sort).exec();
                    }
                } else {
                    result = await collection_name.find({ $and: [query, checkRole] }).sort(sort).exec();
                    // result = await collection_name.find({ $and: [query, checkRole] }, { _id: 0, tenant_name: 1, username: 1, name: 1, uuid: 1, country: 1, role_name: 1, status: 1, state_name: 1, code: 1, state_code: 1 }).sort(sort).exec();
                }
            }
        }

        //Do query for count only when pagination set to true
        if (result.length > 0 && pagination == true) {
            if (filterDate.callstart !== undefined) { // for cdrs only
                totalCount = await collection_name.find({ $and: [query, checkRole, filterDate] }).count().exec();
            } else {
                if (role == "manager") {
                    if (showAssignedListToManager != "") {
                        let condition = module == "user" ? { manager_uuid: manager_uuid } : { tenant_uuid }
                        totalCount = await collection_name.find({ $and: [query, { $or: [condition, { uuid: { $in: showAssignedListToManager } }] }] }).count().exec();
                    } else {
                        //totalCount = await collection_name.find({ $and: [query, checkRole] }).count().exec();
                        totalCount = await collection_name.find({ $and: [query, { $or: [{ tenant_uuid: { $in: tenatUUIDs } }] }] }).count().exec();
                    }
                    // totalCount = await collection_name.find({ $or: [{ tenant_uuid }, { uuid: { $in: showAssignedListToManager } }] }).count().exec();
                } else {
                    totalCount = await collection_name.find({ $and: [query, checkRole] }).count().exec();
                }
            }
        }

        //Check length of data
        /*if(result.length != 0){
            totalCount = await collection_name.find({ $and: [query, checkRole] }).count().exec();
        }*/

        if (queryParams.tableName == 'lead_management_unique') {
            console.log("insidee leaddedd conditon ttttttttt")
            result?.map((data) => {
                if (data.cdrs_details != '' && data.cdrs_details != undefined) {
                    if (data.cdrs_details[0].createdAt != undefined) {
                        data.cdrs_details[0].converted_date = moment.tz(data.cdrs_details[0].createdAt, queryParams.timezone).format("YYYY-MM-DD HH:mm:ss");
                    }
                }
                data.converted_date = moment.tz(data.createdAt, queryParams.timezone).format("YYYY-MM-DD HH:mm:ss");


            })
        }

        if (queryParams.tableName == "cdrs") {
            result?.map((data) => {
                const outResult = typeof data.toObject === 'function' ? data.toObject() : data; // already a plain object
                if (data.disposition !== "NO_ROUTE_DESTINATION"){
                    data.callstart = moment.tz(new Date(outResult.callstart + "Z"), queryParams.timezone).format("YYYY-MM-DD HH:mm:ss");
                }
                // data.disconnected_by_label = outResult.disconnected_by === '0' ? "Agent" : "Customer";
                const user = Array.isArray(outResult.user) ? outResult.user[0] : outResult.user;

                if (user?.username && user?.fullname) {
                    data.agent = `${user.username} - ${user.fullname}`;
                } else if (user?.username) {
                    data.agent = user.username;
                } else {
                    data.agent = "vdad";
                }
            })
        }
        // console.log("for unallocated",queryParams);
        // console.log("for unallocated before result",result);

        // if (queryParams.tableName == "unallocated_leads") {
        //     result = result?.filter((data) => {
        //         data.user_uuid === ""
        //     })
        // }
        // console.log("for unallocated after",result);

        let finalResponse = this.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, totalCount);
        if (pagination == false) {
            delete finalResponse.count;
        }
        // console.log("result", finalResponse)
        return finalResponse;
    }

    /*
    @Usage                 : To get single record based on uuid
    @Param collection_name : schema[tableName]
    @Param uuid            : Search by uuid
    @Param logMessage      : object with error & success message
    @return Object         : Result of searched uuid
    */

    async findOne(collection_name, uuid: string, logMessage, projection: any = "") {
        const result = await collection_name.findOne({ uuid }, projection).exec();
        const res = JSON.parse(logMessage);
        if (result == null) {
            Logger.error(res.logErrorMsg, getMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        return this.sendResponseWithMessage(HttpStatus.OK, result);
    }

    /*
    @Usage                 : To get single record based on uuid
    @Param collection_name : schema[tableName]
    @Param uuid            : Search by uuid
    @Param logMessage      : object with error & success message
    @return Object         : Result of searched uuid
    */

    async findAndUpdate(collection_name, where: object, insertData, logMessage, findType = "one") {
        let queryResult;
        const res = JSON.parse(logMessage);
        switch (findType) {
            case "or":
                queryResult = await collection_name.findOne({ $or: where }).count().exec();
                break;
            case "and":
                queryResult = await collection_name.findOne({ $and: where }).count().exec();
                break;
            default:
                queryResult = await collection_name.findOne({ where }).exec();
                break;
        }

        if (queryResult?.where != where) {
            const checkExist = await collection_name.find({ where }).count().exec();
            if (checkExist > 0) {
                Logger.error(res.logErrorMsg, putMethod);
                res.logErrorMsg = res.logErrorMsg.replace("\n", "").split("by")[0].trim();
                return this.sendResponseWithMessage(HttpStatus.CONFLICT, res.logErrorMsg);
            }
        }

    }

    /*
    @Usage                 : Send response to controller
    @Param statusCode      : HTTP status code
    @Param collection_name : schema[tableName]
    @Param data            : statusCode,data,message
    */

    sendResponseWithMessage(statusCode, data, message: any = "") {
        if (message != "") {
            return { statusCode: statusCode, data: data, message: message }
        } else {
            return { statusCode: statusCode, data: data };
        }
    }

    /*
    @Usage                 : Fetch data by group
    @Param statusCode      : HTTP status code
    @Param collection_name : schema[tableName]
    @Param data            : statusCode,data,message
    */

    async fetchDataByGroup(collection_name, match: any = "", lookup: any = "", group: any = "", sort: any = "", limit: any = "", projection: any = "", unwind: any = "", skip: any = "") {

        let queryArray = [];

        //Apply where condition
        if (match != "") {
            queryArray.push({ $match: match })
        }

        //Get data from another table[Join two tables]
        if (lookup != "") {
            const { from, localField, foreignField, as } = lookup;
            queryArray.push({
                $lookup: { from, localField, foreignField, as }
            });
        }

        if (unwind != "") {
            queryArray.push(unwind)
        }

        //Sort data after group by result
        /*if (sort != "") {
            queryArray.push({ $sort: sort });
        } else {
            queryArray.push({ $sort: { _id: -1 } });
        }*/

        //Get data by group
        if (group != "") {
            queryArray.push({ $group: group });
        }

        //Get selected fileds in query which mentioned in projection
        if (projection != "") {
            queryArray.push({ $project: projection });
        }

        //Sort data after group by result
        if (sort != "") {
            queryArray.push({ $sort: sort });
        } else {
            queryArray.push({ $sort: { _id: -1 } });
        }

        // Apply skip on data
        if (skip != "") {
            queryArray.push({ $skip: skip });
        }

        //Apply limit on data
        if (limit != "") {
            queryArray.push({ $limit: limit });
        }

        return await collection_name.aggregate(queryArray);
    }

    /*
    @Usage                 : Send response to controller
    @Param statusCode      : HTTP status code
    @Param collection_name : schema[tableName]
    @Param data            : statusCode,data,message
    */

    sendResponseWithCount(statusCode, data, count: any = "") {
        if (count != "") {
            return { statusCode: statusCode, count: count, data: data }
        } else {
            return { statusCode: statusCode, data: data };
        }
    }

    /*
    @Usage                       : To get information of manager role[For now we are allowing manager that can use listing of tenant modules that is mentioned in[tenantModulesPermissionToManagerForListing array] to get list of all data or allow only some particular records from that collections , if and if only tenant have added that records from manager roles module.]
    @Param assigned_manager_role : uuid of manager role
    @Param module                : Requested module
    @return object               : Module permission details
    */

    async getManagerRoleInfo(assigned_manager_role, module) {
        let tenantModulesPermissionToManagerForListing = ["user", "extension", "outbound-campaign", "inbound-campaign", "blended-campaign"];
        let value = "";
        if (tenantModulesPermissionToManagerForListing.indexOf(module) !== -1) {
            let managerRoleDetails = await this.manager_role.findOne({ uuid: assigned_manager_role }, { module_permission: 1, _id: 0 }).exec();
            if (managerRoleDetails != null) {
                if (managerRoleDetails.module_permission[module] != undefined) {
                    let getAssignedList = managerRoleDetails.module_permission[module][`${module}-uuids`];
                    value = (getAssignedList == undefined || getAssignedList?.length == 0) ? "-1" : getAssignedList;
                }
            }
        }
        return value;
    }

    /*
   @Usage                 : To get single last record
   @Param collection_name : schema[tableName]
   @Param uuid            : --
   @Param logMessage      : Object with error & success message
   @return Object         : Result of last record from collection
    
   */

    async getLastRecord(collection_name) {
        const result = await collection_name.find({}).sort({ _id: -1 }).limit(1).exec();

        if (result == null) {
            return null;
        }
        return result[0];
    }

    /*
    @Usage                 : To get all manager's of tenant
    @Param tenant_uuid     : uuid of tenant
    @return                : Array of an uuids of manager
    */

    async fetchAllManagersOfTenant(tenant_uuid) {
        let managerUUIDs = [];
        try {
            let managersList = await this.manager.find({ tenant_uuid }, { uuid: 1, _id: 0 }).exec();
            if (managersList) {
                managersList.map((data) => { managerUUIDs.push(data.uuid) })
            }
        } catch (error: any) {
            Logger.error(`Error in catch block ==> fetchAllManagersOfTenant()`, error.message);
        }
        return managerUUIDs;
    }

    async leads_count_update(lead_group, lead_management, outbound_campaign, lead_group_uuid, campaign_uuid) {

        let leadgroupdata = await lead_group.find({ campaign_uuid: campaign_uuid }).select('uuid').exec();

        const uniqueLeadGroupUUIDs = [...new Set(leadgroupdata.map(lead => lead.uuid))];

        const count = await lead_management.countDocuments({ lead_group_uuid: { $in: uniqueLeadGroupUUIDs } }).exec();

        const update_result = await outbound_campaign.updateOne({ uuid: campaign_uuid }, { total_leads_count: count }).exec();
    }

    async leads_in_queue_count_update(leads_in_queue, outbound_campaign, campaign_uuid) {
        let count = await leads_in_queue.countDocuments({ campaign_uuid: campaign_uuid }).count().exec();
        const update_count = await outbound_campaign.updateOne({ uuid: campaign_uuid }, { leads_in_queue_count: count }).exec();
    }

    async leads_in_queue_delete(leads_in_queue, lead_management_uuid, campaign_uuid) {
        let leads_in_queue_data = await leads_in_queue.find({ lead_management_uuid }).select('campaign_uuid').exec();
        if (leads_in_queue_data != "") {
            if (leads_in_queue_data[0]['campaign_uuid'] != campaign_uuid) {
                await leads_in_queue.deleteOne({ lead_management_uuid }).exec();
            }
        }
    }

    async leadgroup_count_update(lead_group, lead_management, lead_group_uuid) {
        let count = await lead_management.countDocuments({ lead_group_uuid: lead_group_uuid }).count().exec();

        const update_count = await lead_group.updateOne({ uuid: lead_group_uuid }, { totalLeadCount: count }).exec();
    }

    // async leads_update_count_update ( lead_group, lead_management, tenant_uuid ) {
    //     let lead_group_data = await lead_group.find( { tenant_uuid } ).select( 'uuid' ).exec();
    //     // console.log( lead_group_data )

    //     lead_group_data?.map( ( data ) => {
    //         if ( data.uuid != '' && data.uuid != undefined ) {
    //             let count = lead_management.countDocuments( { lead_group_uuid: data.uuid } ).exec();
    //             let update_count = lead_group.updateOne( { uuid: data.uuid }, { totalLeadCount: count } ).exec();
    //             console.log( update_count );

    //         }
    //     } )


    // }

    async leads_update_count_update(lead_group, lead_management, tenant_uuid) {
        let lead_group_data = await lead_group.find({ tenant_uuid }).select('uuid').exec();

        // Using Promise.all to await multiple promises concurrently
        await Promise.all(lead_group_data.map(async (data) => {
            if (data.uuid != '' && data.uuid != undefined) {
                let count = await lead_management.countDocuments({ lead_group_uuid: data.uuid }).exec();
                let update_count = await lead_group.updateOne({ uuid: data.uuid }, { totalLeadCount: count }).exec();
            }
        }));
    }
}
