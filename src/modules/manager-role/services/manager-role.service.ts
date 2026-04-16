import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { ManagerRoleDocument, ManagerRoleSchema } from "../schema/manager-role.schema";
import { CreateManagerRoleDto } from "../dto/create-manager-role.dto";
import { getMethod, putMethod } from "src/global_constant";


@Injectable()

export class ManagerRoleService {

    /*
    @Usage              : To load manager role schema and other libraries
    @Param @InjectModel : It will load manager role schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [manager_role,commonDbFn] 
    */

    constructor(
        @InjectModel(ManagerRoleSchema.name) private readonly manager_role: Model<ManagerRoleDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                      : First it will check whether given role_name exist or not , if not then new manager role will be created else it will throw error
    @Param createManagerRoleDto : Request paramter that we set into dto
    @return Object              :  Success / Error 
    */

    async create(createManagerRoleDto: CreateManagerRoleDto) {
        const { role_name, advanced_roles } = createManagerRoleDto;
        let logMessages = {
            logErrorMsg: "Manager role already exist \n",
            logSuccessMsg: "Manager role created successfully \n"
        }
        createManagerRoleDto.module_permission = advanced_roles;
        return this.commonDbFn.findAndInsert(this.manager_role, { role_name }, createManagerRoleDto, JSON.stringify(logMessages));
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of manager role with data 
    */

    async findAll(queryParams) {
        let searchFields = ["role_name"];
        return this.commonDbFn.findAllWithPagination(this.manager_role, queryParams, searchFields);
    }

    /*
    @Usage          : To get single manager role record based on uuid
    @Param uuid     : Search manager role by uuid
    @return Object  : Result of manager 
    */

    async findOne(uuid: string) {
        const getManagerRoleDetail = await this.manager_role.findOne({ uuid }).exec();
        if (getManagerRoleDetail == null) {
            Logger.error(`Manager role not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Manager not found" })
        }
        Logger.debug(`Manager role fetched successfully by uuid : ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, getManagerRoleDetail);
    }

    /*
    @Usage                      : Check role name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                 : Update role name by uuid
    @Param createManagerRoleDto : Request parameters for update
    @return Object              : Success / Error 
    */

    async update(uuid: string, createManagerRoleDto: CreateManagerRoleDto) {
        const { role_name , tenant_uuid , advanced_roles } = createManagerRoleDto;
        const getManagerRoleDetails = await this.manager_role.findOne({ uuid }).exec();

        //Check role name exist
        if (getManagerRoleDetails?.role_name != role_name) {
            let result = await this.manager_role.find({ role_name , tenant_uuid }).count().exec();
            if (result > 0) {
                Logger.error(`Role name already exist \n`, putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Role name already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Manager role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager role updated successfully by uuid : ${uuid} \n`
        }
	createManagerRoleDto.module_permission = advanced_roles;
        return this.commonDbFn.update(this.manager_role, uuid, createManagerRoleDto, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search manager role using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of manager role with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.manager_role, searchParams);
    }

    /*
    @Usage         : To update status of manager role[Active/Inactive]
    @Param uuid    : uuid of manager role
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Manager role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager role status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.manager_role, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple manager role using uuid
    @Param uuid    : To delete single manager role pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Manager role not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager role deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.manager_role, { uuid }, JSON.stringify(logMessages));
    }
}
