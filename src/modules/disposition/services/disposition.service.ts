import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { DispositionDocument, DispositionSchema } from "../schema/disposition.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { Model } from "mongoose";
import { CreateDispositionDto } from "../dto/create-disposition.dto";
import { deleteMethod, putMethod, getMethod } from "src/global_constant";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { LeadReportDocument, LeadReportSchema } from "src/modules/call-center/schema/lead-report.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";

@Injectable()


export class DispositionService {

    /*
    @Usage              : To load disposition schema and other libraries
    @Param @InjectModel : It will load disposition schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [disposition,commonDbFn] 
    */

    constructor(
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(LeadReportSchema.name) private readonly lead_report: Model<LeadReportDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                      : First it will check whether given name exist or not , if not then new disposition will be created else it will throw error
    @Param createDispositionDto : Request paramter that we set into dto
    @return Object              : Success / Error 
    */

    // async create(createDispositionDto: CreateDispositionDto) {
    //     const { name, tenant_uuid, role } = createDispositionDto;
    //     createDispositionDto.created_flag = role == "tenant" ? "1" : (role == "manager" ? "2" : "0");
    //     if (createDispositionDto.parent_disposition != "" && createDispositionDto.level != 0) {
    //         await this.disposition.updateOne({ disposition_uuid: createDispositionDto.parent_disposition }, { $set: { has_children: true } }).exec();
    //     }
    //     let where = [{ name }, { tenant_uuid }];
    //     let logMessages = {
    //         logErrorMsg: "Disposition already exist \n",
    //         logSuccessMsg: "Disposition created successfully \n"
    //     }
    //     if (createDispositionDto.parent_disposition == "" && createDispositionDto.level != 0) {
    //         return { statusCode: HttpStatus.NO_CONTENT, message: "Parent Disposition should not be Empty" }
    //     }
    //     let response = await this.commonDbFn.findAndInsert(this.disposition, where, createDispositionDto, JSON.stringify(logMessages), "and", true);
    //     if (response.statusCode == 409) { return response; }

    //     //Add entry of newly created disposition in lead report
    //     this.addDataToLeadReport(response.message.disposition_uuid, tenant_uuid);
    //     delete response.message;
    //     return response;
    // }

    async create(createDispositionDto: CreateDispositionDto) {
        const { name, tenant_uuid, role } = createDispositionDto;

        // Set created_flag based on role
        let createdFlag = "0";
        if (role === "tenant") {
            createdFlag = "1";
        } else if (role === "manager") {
            createdFlag = "2";
        }
        createDispositionDto.created_flag = createdFlag;

        // Ensure parent is marked as having children
        if (createDispositionDto.parent_disposition && createDispositionDto.level != 0) {
            await this.disposition.updateOne(
                { disposition_uuid: createDispositionDto.parent_disposition },
                { $set: { has_children: true } }
            ).exec();
        }

        // Prevent orphan children
        if (!createDispositionDto.parent_disposition && createDispositionDto.level != 0) {
            return {
                statusCode: HttpStatus.NO_CONTENT,
                message: "Parent Disposition should not be Empty"
            };
        }

        // Inherit campaign_uuid from parent if applicable
        if (createDispositionDto.parent_disposition) {
            const parent = await this.disposition.findOne(
                { disposition_uuid: createDispositionDto.parent_disposition },
                { campaign_uuid: 1 }
            ).lean();

            if (parent?.campaign_uuid?.length) {
                // If not set manually, inherit
                if (!createDispositionDto.campaign_uuid || !createDispositionDto.campaign_uuid.length) {
                    createDispositionDto.campaign_uuid = parent.campaign_uuid;
                }
            }
        }

        // Check duplicates
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Disposition already exist \n",
            logSuccessMsg: "Disposition created successfully \n"
        };

        // Insert the new disposition
        const response = await this.commonDbFn.findAndInsert(
            this.disposition,
            where,
            createDispositionDto,
            JSON.stringify(logMessages),
            "and",
            true
        );

        if (response.statusCode === 409) return response;

        const newDispo = response.message;
        const inheritedCampaignUUIDs = createDispositionDto.campaign_uuid || [];

        // ✅ Recursively update all children with the same campaign_uuid
        const updateChildCampaignUUIDs = async (parentId: string) => {
            const children = await this.disposition.find(
                { parent_disposition: parentId },
                { disposition_uuid: 1, campaign_uuid: 1, has_children: 1 }
            ).lean();

            for (const child of children) {
                await this.disposition.updateOne(
                    { disposition_uuid: child.disposition_uuid },
                    { $set: { campaign_uuid: inheritedCampaignUUIDs } }
                ).exec();

                if (child.has_children) {
                    await updateChildCampaignUUIDs((child as any).disposition_uuid);
                }
            }
        };

        // Run recursive update if newDispo has children
        if (newDispo.has_children) {
            await updateChildCampaignUUIDs(newDispo.disposition_uuid);
        }

        // Add to lead report
        this.addDataToLeadReport(newDispo.disposition_uuid, tenant_uuid);
        delete response.message;

        return response;
    }


    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of disposition with data 
    */

    /*async findAll(queryParams) {
        let searchFields = ["name","code"];
        return this.commonDbFn.findAllWithPagination(this.disposition, queryParams, searchFields);
    }*/

    // async findAll(queryParams) {
    //     let searchFields: any = ["name", "code"];
    //     const { role, tenant_uuid } = queryParams;

    //     let searchParams = [], query: any = {}, result, totalCount = 0, pagination = true;
    //     const perPage = Number(queryParams.limit) || 10;
    //     const currentPage = Number(queryParams.page) || 1;
    //     const skip = perPage * (currentPage - 1);

    //     const tenant_details = await this.tenant.findOne(
    //         { uuid: tenant_uuid },
    //         { tenant_name: 1, system_disposition: 1 }
    //     ).exec();

    //     // Send all data
    //     if (queryParams.limit == undefined && queryParams.page == undefined) {
    //         pagination = false;
    //     } else if (queryParams.list == "all") {
    //         pagination = false;
    //     }

    //     // Check search parameters
    //     if (queryParams.search != "" && queryParams.search != undefined && searchFields.length > 0) {
    //         searchFields.map((data) => {
    //             searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } });
    //         });
    //         query = { '$or': searchParams };
    //     }

    //     // Always add level = 0 to the query
    //     let levelCondition = { level: 0 };

    //     // Pagination block
    //     if (pagination) {
    //         result = await this.getDataBasedOnRole(
    //             role,
    //             tenant_uuid,
    //             { $and: [query, levelCondition] },  // <-- Injected level filter
    //             perPage,
    //             skip,
    //             pagination,
    //             false,
    //             tenant_details
    //         );
    //     } else {
    //         const baseQuery = { $and: [{ level: 0 }] }; // <-- Injected level filter

    //         if (role == "master_admin" || role == "manager" || tenant_details.system_disposition == "1") {
    //             result = await this.disposition.find(
    //                 { $and: [{ tenant_uuid }, { level: 0 }] },
    //                 { name: 1, uuid: 1, _id: 0, status: 1, created_flag: 1, disposition_uuid: 1, code: 1 }
    //             ).sort({ _id: -1 }).exec();
    //         } else {
    //             result = await this.disposition.find(
    //                 {
    //                     $and: [
    //                         { $or: [{ tenant_uuid }, { created_flag: "0" }] },
    //                         { level: 0 }
    //                     ]
    //                 },
    //                 { name: 1, uuid: 1, _id: 0, status: 1, created_flag: 1, disposition_uuid: 1, code: 1 }
    //             ).sort({ _id: -1 }).exec();
    //         }
    //     }

    //     // Count for pagination
    //     if (result.length > 0 && pagination === true) {
    //         totalCount = await this.getDataBasedOnRole(
    //             role,
    //             tenant_uuid,
    //             { $and: [query, levelCondition] },  // <-- Also apply here
    //             perPage,
    //             skip,
    //             pagination,
    //             true,
    //             tenant_details
    //         );
    //     }

    //     let finalResponse = this.commonDbFn.sendResponseWithCount(
    //         result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK,
    //         result,
    //         totalCount
    //     );

    //     if (pagination == false) {
    //         delete finalResponse.count;
    //     }

    //     return finalResponse;
    // }

    async findAll(queryParams) {
        const searchFields: string[] = ["name", "code"];
        const { role, tenant_uuid } = queryParams;

        let query: any = {};
        let pagination = true;
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        let totalCount = 0;

        const tenant_details = await this.tenant.findOne(
            { uuid: tenant_uuid },
            { tenant_name: 1, system_disposition: 1 }
        ).exec();

        // Disable pagination if not required
        if ((!queryParams.limit && !queryParams.page) || queryParams.list === "all") {
            pagination = false;
        }

        // Build search query
        if (queryParams.search && searchFields.length > 0) {
            const searchParams = searchFields.map(field => ({
                [field]: { $regex: queryParams.search, $options: 'i' }
            }));
            query = { $or: searchParams };
        }

        // Always start from level 0
        const levelCondition = { level: 0 };
        const combinedQuery = { $and: [query, levelCondition] };

        let result: any[] = [];
        // console.log("queryParams", queryParams)

        // Fetch level 0 dispositions via role logic
        result = await this.getDataBasedOnRole(
            role,
            tenant_uuid,
            role == 'master_admin' ? levelCondition : combinedQuery,
            perPage,
            skip,
            pagination,
            false,
            tenant_details
        );
        // console.log("queryParams result", result)

        // Count for paginated requests
        if (pagination && result.length > 0) {
            totalCount = await this.getDataBasedOnRole(
                role,
                tenant_uuid,
                combinedQuery,
                perPage,
                skip,
                pagination,
                true,
                tenant_details
            );
        }

        // Fetch all dispositions once to build full tree
        const allDispositions = await this.disposition.find(
            { tenant_uuid },
            // {
            //     name: 1,
            //     uuid: 1,
            //     level: 1,
            //     parent_disposition: 1,
            //     status: 1,
            //     created_flag: 1,
            //     disposition_uuid: 1,
            //     campaign_uuid: 1,
            //     code: 1,
            //     _id: 0
            // }
        ).sort({ status: 1, _id: -1 }).exec();

        // Attach children to each level-0 disposition in result
        for (let i = 0; i < result.length; i++) {
            const doc = result[i].toObject(); // Convert Mongoose document to plain JS object
            doc.children = this.buildDispositionTree(allDispositions, doc.disposition_uuid);
            result[i] = doc; // Replace original Mongoose doc with plain object + children
        }


        // Build final response
        let finalResponse = this.commonDbFn.sendResponseWithCount(
            result.length === 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK,
            result,
            totalCount
        );

        if (!pagination) {
            delete finalResponse.count;
        }

        return finalResponse;
    }


    private buildDispositionTree(dispositions: any[], parentId: string): any[] {
        return dispositions
            .filter(d => d.parent_disposition === parentId)
            .map(d => {
                const node = d.toObject(); // Convert Mongoose document to plain object
                node.children = this.buildDispositionTree(dispositions, d.disposition_uuid);
                return node;
            });
    }



    /*
    @Usage          : To get single disposition record based on uuid
    @Param uuid     : Search disposition by uuid
    @return Object  : Result of disposition 
    */

    // async findOne(disposition_uuid: string) {
    //     let logMessages = {
    //         logErrorMsg: `Disposition not found by uuid : ${disposition_uuid} \n`,
    //         logSuccessMsg: `Disposition success fetched by uuid : ${disposition_uuid} \n`
    //     }
    //     const result = await this.disposition.findOne({ disposition_uuid }).exec();
    //     const res = logMessages;
    //     if (result == null) {
    //         Logger.error(res.logErrorMsg, getMethod);
    //         res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
    //     }
    //     Logger.debug(res.logSuccessMsg);
    //     return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    //     // return this.commonDbFn.findOne(this.disposition, uuid, JSON.stringify(logMessages));
    // }

    async findOne(disposition_uuid: string) {
        const logMessages = {
            logErrorMsg: `Disposition not found by uuid : ${disposition_uuid} \n`,
            logSuccessMsg: `Disposition success fetched by uuid : ${disposition_uuid} \n`
        };

        const result = await this.disposition.findOne({ disposition_uuid }).exec();

        if (!result) {
            Logger.error(logMessages.logErrorMsg, getMethod);
            const message = logMessages.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, message);
        }

        Logger.debug(logMessages.logSuccessMsg);

        // Convert main result to plain object
        const dispositionObject = result.toObject();

        // Fetch all dispositions for the same tenant
        const allDispositions = await this.disposition.find(
            { tenant_uuid: dispositionObject.tenant_uuid }
            // {
            //     name: 1,
            //     uuid: 1,
            //     level: 1,
            //     parent_disposition: 1,
            //     status: 1,
            //     created_flag: 1,
            //     disposition_uuid: 1,
            //     campaign_uuid: 1,
            //     code: 1,
            //     _id: 0
            // }
        ).exec();

        // Attach children
        dispositionObject.children = this.buildDispositionTree(
            allDispositions,
            dispositionObject.disposition_uuid
        );

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, dispositionObject);
    }


    //new
    /*
    @Usage          : To get parent disposition 
    @Param uuid     : Search disposition by uuid
    @return Object  : Result of disposition 
    */

    async findParentDisposition(queryParams) {
        const { tenant_uuid, current_disposition, level, parent_disposition } = queryParams
        let logMessages = {
            logErrorMsg: `Parent Disposition not found. \n`,
            logSuccessMsg: `Parent Disposition successfully fetched. \n`
        }
        // console.log("queryParamsqueryParamsqueryParams", queryParams)
        let result;
        if (parent_disposition) {
            result = await this.disposition.findOne({ $and: [{ tenant_uuid }, { disposition_uuid: parent_disposition }] }).exec();
            // console.log("asdas", result);
            let res = await this.disposition.find({ $and: [{ tenant_uuid }, { disposition_uuid: result.parent_disposition }] })
            result = res
        } else {

            result = await this.disposition.find({ $and: [{ level: level - 1 }, { tenant_uuid }, { disposition_uuid: { $ne: current_disposition } }] }).exec();
        }
        const res = logMessages;
        if (result == null) {
            Logger.error(res.logErrorMsg, getMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    /*
   @Usage          : To get single parent disposition  
   @Param uuid     : Search disposition by uuid
   @return Object  : Result of disposition 
   */

    async findOneParentDisposition(uuid, queryParam) {
        const { tenant_uuid } = queryParam;
        console.log("alksdfhwnlasknkasdn", queryParam, uuid);
        const result = await this.disposition.find({ disposition_uuid: uuid })
        const parent = await this.disposition.find({ disposition_uuid: result[0].parent_disposition });
        console.log("alksdfhwnlasknkasdn", parent);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, parent);

    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    // async update(disposition_uuid: string, createDispositionDto: CreateDispositionDto) {
    //     const { name, tenant_uuid, role } = createDispositionDto;
    //     createDispositionDto.created_flag = role == "tenant" ? "1" : (role == "manager" ? "2" : "0");
    //     if (createDispositionDto.parent_disposition != "" && createDispositionDto.level != 0) {
    //         await this.disposition.updateOne({ disposition_uuid: createDispositionDto.parent_disposition }, { $set: { has_children: true } }).exec();

    //     }
    //     const getDisposition = await this.disposition.findOne({ disposition_uuid }).exec();
    //     if (getDisposition?.name != name) {
    //         const checkgetDispositionExist = await this.disposition.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
    //         if (checkgetDispositionExist > 0) {
    //             Logger.error("Disposition already exist \n", putMethod);
    //             return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Disposition already exist`);
    //         }
    //     }
    //     let logMessages = {
    //         logErrorMsg: `Disposition not found by uuid : ${disposition_uuid} \n`,
    //         logSuccessMsg: `Disposition updated successfully by uuid : ${disposition_uuid} \n`
    //     }

    //     const result = await this.disposition.updateOne({ disposition_uuid }, createDispositionDto).exec();
    //     const res = logMessages;
    //     if (result.matchedCount == 0 && result.modifiedCount == 0) {
    //         Logger.error(res.logErrorMsg, deleteMethod);
    //         res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
    //         return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
    //     }
    //     Logger.debug(res.logSuccessMsg);
    //     res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
    //     return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    //     //return this.commonDbFn.update(this.disposition, disposition_uuid, createDispositionDto, JSON.stringify(logMessages));
    // }

    async update(disposition_uuid: string, createDispositionDto: CreateDispositionDto) {
        const { name, tenant_uuid, role } = createDispositionDto;

        // Set created_flag based on role
        let createdFlag = "0";
        if (role === "tenant") {
            createdFlag = "1";
        } else if (role === "manager") {
            createdFlag = "2";
        }
        createDispositionDto.created_flag = createdFlag;

        // ❌ Never allow frontend to control hierarchy flag
        delete createDispositionDto.has_children;

        // ✅ If level is 0 → make it root ONLY (do not touch children)
        if (createDispositionDto.level === 0) createDispositionDto.parent_disposition = "";

        // Mark parent as has_children if applicable
        if (createDispositionDto.parent_disposition && createDispositionDto.level !== 0) {
            await this.disposition.updateOne(
                { disposition_uuid: createDispositionDto.parent_disposition },
                { $set: { has_children: true } }
            ).exec();
        }

        // Prevent duplicate disposition names for the same tenant
        const getDisposition = await this.disposition.findOne({ disposition_uuid }).exec();
        if (getDisposition?.name !== name) {
            const checkgetDispositionExist = await this.disposition.find({
                $and: [{ name }, { tenant_uuid }]
            }).count().exec();

            if (checkgetDispositionExist > 0) {
                Logger.error("Disposition already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Disposition already exist`);
            }
        }

        // Prepare logs
        let logMessages = {
            logErrorMsg: `Disposition not found by uuid : ${disposition_uuid} \n`,
            logSuccessMsg: `Disposition updated successfully by uuid : ${disposition_uuid} \n`
        };

        // // ✅ ADD THIS BLOCK
        // if (createDispositionDto.level === 0) {
        //     createDispositionDto.has_children = false;
        //     createDispositionDto.parent_disposition = "";
        // }

        // Perform update
        const result = await this.disposition.updateOne({ disposition_uuid }, createDispositionDto).exec();

        if (result.matchedCount === 0 && result.modifiedCount === 0) {
            Logger.error(logMessages.logErrorMsg, deleteMethod);
            logMessages.logErrorMsg = logMessages.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, logMessages.logErrorMsg);
        }

        // ✅ Recursive update of children campaign_uuid (BUT NOT when moving to root)
        const inheritedCampaignUUIDs = createDispositionDto.campaign_uuid || [];

        const updateChildCampaignUUIDs = async (parentId: string) => {
            const children = await this.disposition.find(
                { parent_disposition: parentId },
                { disposition_uuid: 1, has_children: 1 }
            ).lean();

            for (const child of children) {
                await this.disposition.updateOne(
                    { disposition_uuid: child.disposition_uuid },
                    { $set: { campaign_uuid: inheritedCampaignUUIDs } }
                ).exec();

                if (child.has_children) {
                    await updateChildCampaignUUIDs((child as any).disposition_uuid);
                }
            }
        };

        if (inheritedCampaignUUIDs.length && createDispositionDto.level !== 0) {
            await updateChildCampaignUUIDs(disposition_uuid);
        }

        // ✅ Recalculate has_children for this disposition (system truth)
        const childCount = await this.disposition.countDocuments({ parent_disposition: disposition_uuid });
        await this.disposition.updateOne({ disposition_uuid }, { $set: { has_children: childCount > 0 } });

        // Log success
        Logger.debug(logMessages.logSuccessMsg);
        logMessages.logSuccessMsg = logMessages.logSuccessMsg.split("by")[0].trim();

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, logMessages.logSuccessMsg);
    }


    /*
    @Usage              : To search disposition using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of disposition with data 
    */

    /*async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.disposition, searchParams);
    }*/

    async advancedSearch(searchParams) {
        var i, count = 0;
        let where = [];

        //Check Role type
        let { role, tenant_uuid } = searchParams;
        if (role == "tenant") {
            where.push({ "$or": [{ tenant_uuid }, { created_flag: "0" }] });
        } else {
            where.push({ tenant_uuid });
        }

        //Delete unnecessary details from request
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;

        var objectKeys = Object.keys(searchParams);
        var objectValues = Object.values(searchParams);
        var len = objectKeys.length;

        let filedName, filedValue, searchFlag, key, obj;
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


        const result = await this.disposition.find({ $and: where }).exec();
        if (result.length > 0) {
            count = await this.disposition.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
        }
    }

    /*
    @Usage         : To update status of disposition[Active/Inactive]
    @Param uuid    : uuid of disposition
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(disposition_uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Disposition not found by uuid : ${disposition_uuid} \n`,
            logSuccessMsg: `Disposition status updated successfully by uuid : ${disposition_uuid} \n`
        }
        const result = await this.disposition.updateOne({ disposition_uuid }, body).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);

        //return this.commonDbFn.update(this.disposition, disposition_uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple disposition using uuid
    @Param uuid    : To delete single disposition pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(disposition_uuid: string) {
        let logMessages = {
            logErrorMsg: `Disposition not exist by uuid : ${disposition_uuid} \n`,
            logSuccessMsg: `Disposition deleted successfully by uuid : ${disposition_uuid} \n`
        }
        let uuids = disposition_uuid.split(",");
        // const res = JSON.parse(logMessage);
        const result = await this.disposition.deleteMany({ disposition_uuid: { $in: uuids } }).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if (result.deletedCount == 0) {
            Logger.error(logMessages.logErrorMsg, deleteMethod);
            logMessages.logErrorMsg = logMessages.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, logMessages.logErrorMsg, deletedCount);
        }
        Logger.debug(logMessages.logSuccessMsg);
        logMessages.logSuccessMsg = logMessages.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, logMessages.logSuccessMsg, deletedCount);
        // return this.commonDbFn.delete(this.disposition, { disposition_uuid : disposition_uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage                 : To add newly disposition in lead report
    @Param dispositionUUID : uuid of disposition
    @Param tenant_uuid     : uuid of tenant
    */

    async addDataToLeadReport(dispositionUUID, tenant_uuid) {
        try {
            //Fetch all lead group of tenant
            let allLeadGroups = await this.lead_group.find({ tenant_uuid }).exec();
            let obj, leadGroupArr = [];
            allLeadGroups.map((data) => {
                obj = {
                    lead_group_uuid: data.uuid,
                    disposition_uuid: dispositionUUID,
                    called_count: 0,
                    count: 0
                }
                leadGroupArr.push(obj);
            });
            await this.lead_report.insertMany(leadGroupArr, { ordered: false });
        } catch (error) {
            Logger.error(`Error in catch block ===> addDataToLeadReport()`, error.message);
        }
    }

    /*
    @Usage             : To get disposition data based on role
    @Param role        : [master_admin,tenant,manager]
    @Param tenant_uuid : uuid of tenant
    @Param query       : search parameter
    @Param perPage     : Records per page
    @Param skip        : Records to skip
    */

    async getDataBasedOnRole(role, tenant_uuid, query, perPage, skip, pagination, getCount = false, tenant_details) {
        let result;
        switch (role) {
            case "master_admin":
                if (pagination && getCount == false) {
                    result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
                } else if (pagination && getCount) {
                    result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).count().exec();
                } else {
                    result = await this.disposition.find({ tenant_uuid }).sort({ _id: -1 }).exec();
                }
                break;
            case "tenant":
                if (pagination && getCount == false) {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
                    }
                } else if (pagination && getCount) {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).count().exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).count().exec();
                    }
                } else {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).sort({ _id: -1 }).exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).sort({ _id: -1 }).exec();
                    }
                }
                break;
            case "manager":
                if (pagination && getCount == false) {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
                    }
                } else if (pagination && getCount) {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).count().exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).count().exec();
                    }
                } else {
                    if (tenant_details?.system_disposition == "1") {
                        result = await this.disposition.find({ $and: [{ tenant_uuid }, query] }).sort({ _id: -1 }).exec();
                    } else {
                        result = await this.disposition.find({ $and: [{ $or: [{ tenant_uuid }, { created_flag: "0" }] }, query] }).sort({ _id: -1 }).exec();
                    }
                }
                break;
        }
        return result;
    }
}
