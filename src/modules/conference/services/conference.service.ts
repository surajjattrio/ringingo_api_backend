import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateConferenceDto } from "../dto/create-conference.dto";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { ConferenceDocument, ConferenceSchema } from "../schema/conference.schema";
import { CommonFunctions } from "src/modules/common/common_functions";

@Injectable()

export class ConferenceService {

    /*
    @Usage              : To load conference schema and other libraries
    @Param @InjectModel : It will load conference schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [conference,commonDbFn] 
    */

    constructor(
        @InjectModel(ConferenceSchema.name) private readonly conference: Model<ConferenceDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        private readonly commonDbFn: CommonDBFunctions,
	private readonly commonFn: CommonFunctions,
    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new conference will be created else it will throw error
    @Param createConferenceDto : Request paramter that we set into dto
    @return Object             : Success / Error 
    */

    async create(createConferenceDto: CreateConferenceDto) {
        const { name, tenant_uuid,  role } = createConferenceDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Conference already exist \n",
            logSuccessMsg: "Conference created successfully \n"
        }
        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createConferenceDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createConferenceDto.tenant_uuid = tenantInfo.tenant_uuid;
                createConferenceDto.manager_uuid = lookupUuid as string;
            } else {
                createConferenceDto.manager_uuid = lookupUuid as string;
            }
        }
        return this.commonDbFn.findAndInsert(this.conference, where, createConferenceDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of conference with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name"];
        let populateFields = [{ path: "user", select: 'username' }, { path: "greeting", select: 'name' }, { path: "tenant", select: 'username tenant_name' }];
        return this.commonDbFn.findAllWithPagination(this.conference, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single conference record based on uuid
    @Param uuid     : Search conference by uuid
    @return Object  : Result of conference 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Conference not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Conference success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.conference, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createConferenceDto: CreateConferenceDto) {
        const { name , tenant_uuid } = createConferenceDto;
        const getConference = await this.conference.findOne({ uuid }).exec();
        if (getConference?.name != name) {
            const checkConferenceExist = await this.conference.find({ $and:[{name},{tenant_uuid}] }).count().exec();
            if (checkConferenceExist > 0) {
                Logger.error("Conference already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Conference already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Conference not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Conference updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.conference,uuid,createConferenceDto,JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search conference using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of conference with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "user", select: 'username' }, { path: "greeting", select: 'name' }, { path: "tenant", select: 'username tenant_name' }];
        return this.commonDbFn.advancedSearch(this.conference, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of conference[Active/Inactive]
    @Param uuid    : uuid of conference
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Conference not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Conference status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.conference, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple conference using uuid
    @Param uuid    : To delete single conference pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Conference not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Conference deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.conference, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage             : To kill conference uuid
    @Param uuid        : uuid of conference
    @return Object     : Success / Error
    */

    async killConferenceUUID(requestData) {
        const { conference_uuid } = requestData;
        await this.commonFn.killUUID(conference_uuid);
	return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `UUID killed`);
    }

    /*
    @Usage             : To send DTMF
    @Param requestData : Contains uuid and digit
    @return Object     : Success / Error
    */

    async sendDTMF(requestData) {
        const { uuid , digit } = requestData;
        await this.commonFn.sendDTMF(uuid,digit);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `DTMF Sent`);
    }


}
