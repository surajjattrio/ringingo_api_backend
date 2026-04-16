import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CallerIdGroupSchema, callerIdGroupDocument } from "../schema/caller-id-group.schema";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateCallerIdGroupDto } from "../dto/create-caller-id-group.dto";
import { deleteMethod, putMethod } from "src/global_constant";
import { parseStream } from 'fast-csv';
import * as fs from 'fs';
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { CallerIdSchema, callerIdDocument } from "../schema/caller-ids.schema";
import { AddCallerIdDto } from "../dto/add-caller-id.dto";

@Injectable()

export class CallerIdGroupService {

    /*
    @Usage              : To load caller id group schema and other libraries
    @Param @InjectModel : It will load caller id group schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [caller_id_group,commonDbFn] 
    */

    constructor(
        @InjectModel(CallerIdGroupSchema.name) private readonly caller_id_group: Model<callerIdGroupDocument>,
        @InjectModel(CallerIdSchema.name) private readonly caller_ids: Model<callerIdDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                        : First it will check whether given caller_id exist or not , if not then new caller Id group will be created else it will throw error
    @Param createCallerIdGroupDto : Request paramter that we set into dto
    @return Object                : Success / Error 
    */

    async create(createCallerIdGroupDto: CreateCallerIdGroupDto) {
        const { caller_id_group, tenant_uuid, role } = createCallerIdGroupDto;
        let where = [{ caller_id_group }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Caller Id group already exist \n",
            logSuccessMsg: "Caller ID group added successfully \n"
        }

        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createCallerIdGroupDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createCallerIdGroupDto.tenant_uuid = tenantInfo.tenant_uuid;
                createCallerIdGroupDto.manager_uuid = lookupUuid as string;
            } else {
                createCallerIdGroupDto.manager_uuid = createCallerIdGroupDto.manager_uuid || "";
            }
        }

        return this.commonDbFn.findAndInsert(this.caller_id_group, where, createCallerIdGroupDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of caller id group with data 
    */

    async findAll(queryParams) {
        let searchFields = ["caller_id_group"];
        return this.commonDbFn.findAllWithPagination(this.caller_id_group, queryParams, searchFields);
    }

    /*
    @Usage          : To get single caller id group record based on uuid
    @Param uuid     : Search caller id group by uuid
    @return Object  : Result of caller id group 
    */

    async findOne(uuid: string,queryParams) {
        let result;
        if(queryParams.page > 1){
            let result = await this.fetchAllWithPagination(queryParams,uuid);
            result["caller_ids"] = result;
	    let totalCount = 0,statusCode = HttpStatus.NOT_FOUND;
	    if(result.length > 0){
	     totalCount = await this.caller_ids.find({ caller_id_group_uuid: uuid }).count().exec();
	     statusCode = HttpStatus.OK;
	    }
	    return this.commonDbFn.sendResponseWithCount(statusCode,result,totalCount);
        }

	let logMessages = {
            logErrorMsg: `Caller Id group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Caller Id group success fetched by uuid : ${uuid} \n`
        }
        let projection = { user_uuid: 1, status: 1, caller_id_group: 1, _id: 0 };
        let response = await this.commonDbFn.findOne(this.caller_id_group, uuid, JSON.stringify(logMessages), projection);
        if (response.statusCode == 404) { return response; }

        let callerIdGroupResult = await this.caller_ids.find({ caller_id_group_uuid: uuid }, { caller_id: 1, _id: 0, uuid : 1 }).limit(queryParams.limit).exec();
        response["caller_ids"] = callerIdGroupResult;
	response["count"] = await this.caller_ids.find({ caller_id_group_uuid: uuid }).count().exec();
        return response;
    }

    /*
    @Usage                     : Check caller_id which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update caller id group by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createCallerIdGroupDto: CreateCallerIdGroupDto) {
        const { caller_id_group, tenant_uuid, caller_id } = createCallerIdGroupDto;
        const getCallerId = await this.caller_id_group.findOne({ uuid }).exec();
        if (getCallerId?.caller_id_group != caller_id_group) {
            const checkCallerId = await this.caller_id_group.find({ $and: [{ caller_id_group }, { tenant_uuid }] }).count().exec();
            if (checkCallerId > 0) {
                Logger.error("Caller Id group already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Caller Id group already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Caller Id group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Caller ID group updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.caller_id_group, uuid, createCallerIdGroupDto, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search caller id group using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of caller id group with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.caller_id_group, searchParams);
    }

    /*
    @Usage         : To update status of caller id group[Active/Inactive]
    @Param uuid    : uuid of caller id group
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Caller Id group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Caller Id group status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.caller_id_group, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple caller id group using uuid
    @Param uuid    : To delete single caller id group pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Caller Id group not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Caller Id group deleted successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.delete(this.caller_id_group, { uuid }, JSON.stringify(logMessages));
        let uuids = uuid.split(",");
        await this.caller_ids.deleteMany({ caller_id_group_uuid: { $in: uuids } });
        return response;
    }

    /*
    @Usage                 : To add received object from addCsvData() function into DB
    @Param postData        : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async importCallerIdGroup(postData) {
        let { file } = postData;
        let allCallerIdGroup: any = await this.addCsvData(postData);
        allCallerIdGroup.shift();
        let insertedRecords = 0, recordText;
        try {
            //await this.caller_id_group.insertMany(allCallerIdGroup, { ordered: false });
            await this.caller_ids.insertMany(allCallerIdGroup, { ordered: false });
            insertedRecords = allCallerIdGroup.length;
        } catch (error) {
            insertedRecords = error.result.nInserted;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
            Logger.debug(`${file} file deleted`);
        });
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Imported ${insertedRecords} ${recordText.trim()}`);
    }

    /*
    @Usage                 : To create object with csv data
    @Param postData        : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async addCsvData(postData) {
        let { user_uuid, file, tenant_uuid , caller_id_group_uuid } = postData;
        let allCallerIdGroup = [];
        let obj: any = {};
        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
            parseStream(stream)
                .on('error', error => console.error(error))
                .on('data', row => {
                    obj = {
                       /* user_uuid,
                        caller_id_group: row[0],
                        status: "0",
                        tenant_uuid */
		        caller_id : row[0],
			caller_id_group_uuid : caller_id_group_uuid
                    }
                    allCallerIdGroup.push(obj);
                })
                .on('end', async (rowCount: number) => {
                    resolve(allCallerIdGroup);
                });
        });
    }

    /*
    @Usage                                      : To create caller ids
    @Param callerID                             : Caller id
    @Param callerIdGroupLastinsertedUUID        : Last inserted UUID of caller id group
    @return Object                              : Success / Error 
    */

    async createCallerIds(callerID, callerIdGroupLastinsertedUUID) {
        let obj = {
            caller_id_group_uuid: callerIdGroupLastinsertedUUID,
            caller_id: callerID
        }
        await this.caller_ids.insertMany(obj);
    }

    /*
    @Usage               : To add caller id
    @Method              : POST
    @Param callerIdData  : caller id data
    @return Object       : Success / Error
    */

    async addCallerId(callerIdData: AddCallerIdDto) {
        const { caller_id, caller_id_group_uuid } = callerIdData;
        let where = [{ caller_id }, { caller_id_group_uuid }];
        let logMessages = {
            logErrorMsg: "Caller Id already exist \n",
            logSuccessMsg: "Caller Id added successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.caller_ids, where, callerIdData, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage               : To delete caller id
    @Method              : POST
    @Param callerIdData  : caller id data
    @return Object       : Success / Error
    */

    async removeCallerId(caller_id_group_uuid : string , uuid : string) {
	let uuids = uuid.split(",");
        let result = await this.caller_ids.deleteMany({ $and : [{ uuid : uuids }, { caller_id_group_uuid }] }).exec();
        if(result.deletedCount == 0){
            Logger.error("Caller Id not exist \n", deleteMethod);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Caller Id not exist`);
        }
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK,`Caller Id deleted successfully`,result.deletedCount);
    }

    /*
    @Usage               : To fetch caller ids based on pagination
    @Param queryParams   : Contains pagination params
    @Param uuid          : uuid of caller id group
    @return Object
    */

    async fetchAllWithPagination(queryParams, uuid) {
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        let callerIdGroupResult;
        callerIdGroupResult = await this.caller_ids.find({ caller_id_group_uuid: uuid }, { caller_id: 1, _id: 0, uuid: 1 }).limit(perPage).skip(skip);
        return callerIdGroupResult;
    }

}
