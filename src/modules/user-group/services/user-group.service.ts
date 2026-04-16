import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateUserGroupDto } from "../dto/create-user-group.dto";
import { UserGroupDocument, UserGroupSchema } from "../schema/user-group.schema";

@Injectable()

export class UserGroupService {

    /*
    @Usage              : To load user group schema and other libraries
    @Param @InjectModel : It will load user group schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [user_group,commonDbFn] 
    */

    constructor(
        @InjectModel(UserGroupSchema.name) private readonly user_group: Model<UserGroupDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                 : First it will check whether given name exist or not , if not then new user group will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async create(createUserGroupDto: CreateUserGroupDto) {
        const { name, tenant_uuid } = createUserGroupDto;
        //createUserGroupDto.user_uuid = user_uuid?.split(",");
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "User group already exist \n",
            logSuccessMsg: "User group created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.user_group, where, createUserGroupDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of user group with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name"];
        let populateFields = [{ path: "tenant", select: 'username tenant_name' },{ path: "outbound_rule_detail", select: 'name' }];
        return this.commonDbFn.findAllWithPagination(this.user_group, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single conference record based on uuid
    @Param uuid     : Search conference by uuid
    @return Object  : Result of conference 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `User group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User group success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.user_group, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user group by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createUserGroupDto: CreateUserGroupDto) {
        const { name, tenant_uuid } = createUserGroupDto;
        const getUserGroup = await this.user_group.findOne({ uuid }).exec();
        if (getUserGroup?.name != name) {
            const checkUserGroupExist = await this.user_group.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkUserGroupExist > 0) {
                Logger.error("User Group already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `User Group already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `User Group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User Group updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.user_group, uuid, createUserGroupDto, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search user group using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of user group with data 
   */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name' },{ path: "outbound_rule_detail", select: 'name' }];
        return this.commonDbFn.advancedSearch(this.user_group, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of user group[Active/Inactive]
    @Param uuid    : uuid of user group
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `User group not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User group status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.user_group, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple user group using uuid
    @Param uuid    : To delete single user group pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `User group not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `User group deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.user_group, { uuid }, JSON.stringify(logMessages));
    }
}
