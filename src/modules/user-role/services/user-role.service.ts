import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateUserRoleDto } from "../dto/create-user-role.dto";
import { UserRoleDocument, UserRoleSchema } from "../schema/user-role.schema";
import { StickyAgentDocument, StickyAgentSchema } from "src/modules/sticky-agent/schema/sticky-agent.schema";

@Injectable()

export class UserRoleService {

    /*
    @Usage              : To load user role schema and other libraries
    @Param @InjectModel : It will load user role schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [user_role,commonDbFn] 
    */

    constructor(
        @InjectModel(UserRoleSchema.name) private readonly user_role: Model<UserRoleDocument>,
	@InjectModel( StickyAgentSchema.name ) private readonly sticky_agent: Model<StickyAgentDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                 : First it will check whether given name exist or not , if not then new user role will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async create(createUserRoleDto: CreateUserRoleDto) {
        const { name, tenant_uuid } = createUserRoleDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "User role already exist \n",
            logSuccessMsg: "User role created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.user_role, where, createUserRoleDto, JSON.stringify(logMessages), "and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of user roles with data 
    */

    async findAll(queryParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name' }];
        let searchFields = "";
        // let searchFields = ["name"];

        return this.commonDbFn.findAllWithPagination(this.user_role, queryParams, searchFields , populateFields);
    }

    /*
    @Usage          : To get single user role record based on uuid
    @Param uuid     : Search user role by uuid
    @return Object  : Result of user role 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `User role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User role success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.user_role, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createUserRoleDto: CreateUserRoleDto) {
        const { name , tenant_uuid } = createUserRoleDto;
        const getUserRole = await this.user_role.findOne({ uuid }).exec();
        if (getUserRole?.name != name) {
            const checkUserRoleExist = await this.user_role.find({ $and:[{name},{tenant_uuid}] }).count().exec();
            if (checkUserRoleExist > 0) {
                Logger.error("User role already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `User role already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `User role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User role updated successfully by uuid : ${uuid} \n`
        }
	await this.sticky_agent.updateOne( { user_role_uuid: uuid }, { $set: { sticky_user_role_status: createUserRoleDto.sticky_agent } } ).exec();
        return this.commonDbFn.update(this.user_role,uuid,createUserRoleDto,JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple user role using uuid
    @Param uuid    : To delete single user role pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `User not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User role deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.user_role, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search user role using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of user role with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name' }];
        return this.commonDbFn.advancedSearch(this.user_role, searchParams,populateFields);
    }

    /*
    @Usage         : To update status of user role[Active/Inactive]
    @Param uuid    : uuid of user role
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `User role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User role status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.user_role, uuid, body, JSON.stringify(logMessages));
    }
}
