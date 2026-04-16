import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreatePbxLeadStatusDto } from "../dto/create-pbx-lead-status.dto";
import { PbxLeadStatusDocument, PbxLeadStatusSchema } from "../schema/pbx-lead-status.schema";
import { Model } from "mongoose";
import { deleteMethod, getMethod, putMethod } from "src/global_constant";

@Injectable()


export class PbxLeadStatusService {

    /*
    @Usage              : To load lead status schema and other libraries
    @Param @InjectModel : It will load lead status schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [pbx_lead_status,commonDbFn] 
    */

    constructor(
        @InjectModel(PbxLeadStatusSchema.name) private readonly pbx_lead_status: Model<PbxLeadStatusDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                        : First it will check whether given name exist or not , if not then new lead status will be created else it will throw error
    @Param createPbxLeadStatusDto : Request paramter that we set into dto
    @return Object                : Success / Error 
    */

    async create(createPbxLeadStatusDto: CreatePbxLeadStatusDto) {
        const { name, tenant_uuid } = createPbxLeadStatusDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Lead status already exist \n",
            logSuccessMsg: "Lead status created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.pbx_lead_status, where, createPbxLeadStatusDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of lead status with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name", "code"];
        return this.commonDbFn.findAllWithPagination(this.pbx_lead_status, queryParams, searchFields,"",{_id : -1},true,true);
    }

    /*
    @Usage          : To get single lead status based on uuid
    @Param uuid     : Search lead status by uuid
    @return Object  : Result of lead status 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Lead status not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead status success fetched by uuid : ${uuid} \n`
        }
        const result = await this.pbx_lead_status.findOne({ pbx_lead_status_uuid: uuid }).exec();
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
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createPbxLeadStatusDto: CreatePbxLeadStatusDto) {
        const { name, tenant_uuid } = createPbxLeadStatusDto;
        const getLeadStatus = await this.pbx_lead_status.findOne({ pbx_lead_status_uuid: uuid }).exec();
        if (getLeadStatus?.name != name) {
            const checkgetLeadStatusExist = await this.pbx_lead_status.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkgetLeadStatusExist > 0) {
                Logger.error("Lead status already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Lead status already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Lead status not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead status updated successfully by uuid : ${uuid} \n`
        }

        const result = await this.pbx_lead_status.updateOne({ pbx_lead_status_uuid: uuid }, createPbxLeadStatusDto).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    }

    /*
    @Usage              : To search lead status using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of lead status with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.pbx_lead_status, searchParams);
    }

    /*
    @Usage         : To update status of lead status[Active/Inactive]
    @Param uuid    : uuid of lead status
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Lead status not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead status updated successfully by uuid : ${uuid} \n`
        }
        const result = await this.pbx_lead_status.updateOne({ pbx_lead_status_uuid: uuid }, body).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
    }

    /*
    @Usage         : Delete single or multiple lead status using uuid
    @Param uuid    : To delete single lead status pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Lead status not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Lead status deleted successfully by uuid : ${uuid} \n`
        }
        let uuids = uuid.split(",");
        const result = await this.pbx_lead_status.deleteMany({ pbx_lead_status_uuid: { $in: uuids } }).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if (result.deletedCount == 0) {
            Logger.error(logMessages.logErrorMsg, deleteMethod);
            logMessages.logErrorMsg = logMessages.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, logMessages.logErrorMsg, deletedCount);
        }
        Logger.debug(logMessages.logSuccessMsg);
        logMessages.logSuccessMsg = logMessages.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, logMessages.logSuccessMsg, deletedCount);
    }
}
