import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateRolesDto } from "../dto/create-roles-dto";
import { RolesDocument, RolesSchema } from "../schema/roles-schema";


@Injectable()

export class RolesService {

    /*
    @Usage              : To load role schema and other libraries
    @Param @InjectModel : It will load role schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [roles,commonDbFn] 
    */

    constructor(
        @InjectModel(RolesSchema.name) private readonly roles: Model<RolesDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                 : First it will check whether given role exist or not , if not then new role will be created else it will throw error
    @Param createRolesDto  : Request paramter that we set into dto
    @return Object         :  Success / Error 
    */

    async create(createRolesDto: CreateRolesDto) {
        const { role_name } = createRolesDto;
        let logMessages = {
            logErrorMsg: "Role already exist \n",
            logSuccessMsg: "Role created successfully \n"
        }
        createRolesDto.default_permission = createRolesDto.basic_roles;
        createRolesDto.module_permission = createRolesDto.advanced_roles;
        return this.commonDbFn.findAndInsert(this.roles, { role_name }, createRolesDto, JSON.stringify(logMessages));
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of roles with data 
    */

    async findAll(queryParams) {
        let searchFields = ["role_name"];
        return this.commonDbFn.findAllWithPagination(this.roles, queryParams, searchFields);
    }

    /*
    @Usage          : To get single role record based on uuid
    @Param uuid     : Search role by uuid
    @return Object  : Result of role 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Role success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.roles, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                  : To update role
    @Param uuid             : update role by uuid
    @Param createRolesDto   : Request parameters for update
    @return Object          : Success / Error 
    */

    async update(uuid: string, createRolesDto: CreateRolesDto) {
        createRolesDto.default_permission = createRolesDto.basic_roles;
        createRolesDto.module_permission = createRolesDto.advanced_roles;
        let logMessages = {
            logErrorMsg: `Role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Role updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.roles, uuid, createRolesDto, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple role using uuid
    @Param uuid    : To delete single role pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Role not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Role deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.roles, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search role using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of role with data 
    */

    advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.roles, searchParams);
    }

    /*
    @Usage         : To update status of role[Active/Inactive]
    @Param uuid    : uuid of role
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Role not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Role status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.roles, uuid, body, JSON.stringify(logMessages));
    }
}