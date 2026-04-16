import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateUserRoleDto } from "../dto/create-user-role.dto";
import { UserRoleService } from "../services/user-role.service";

@Controller("user-role")

/*@Usage : To provide title of API in swagger */
@ApiTags("User Role")

export class UserRoleController {

    /*
    @Usage  : To load user-role service and other libraries
    @return : Object[user-role] 
    */

    constructor(private readonly user_role: UserRoleService) { }

    @Post()
    @postDecoraters("User role created successfully", "Create a new user role")

    /*
    @Usage                      : To create new user role
    @Method                     : POST
    @Param name                 : string
    @Param status               : integer [Default 0]
    @Param pbx_mode             : integer [Default 0]
    @Param call_center_mode     : integer [Default 0]
    @Param call_report          : integer [Default 0]
    @Param login_logout_report  : integer [Default 0]
    @Param tenant_uuid          : integer [Default 0]
    @return success / error object  : { User role created successfully / User role already exist}
    */

    create(@Body() createUserRoleDto: CreateUserRoleDto) {
        return this.user_role.create(createUserRoleDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved user roles successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search user role
    @Method            : POST
    @Param domain      : Single or multiple params
    @return Object     : Array of an object with total count of user roles with data
    */

    advancedSearch(@Body() searchData) {
        return this.user_role.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all user role successfully", "List all user roles")

    /*
    @Usage  : List all user roles
    @Method : GET
    @return : Array of an object with total count of user roles with data
    */

    findAll(@Query() queryParam) {
        return this.user_role.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single user role successfully", "List single user role using uuid")

    /*
    @Usage               : List single user role using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid user role
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.user_role.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("User role update successfully", "Update single user role using uuid")

    /*
    @Usage                      : Update single user role using uuid
    @Method                     : PUT
    @Param name                 : string
    @Param status               : integer [Default 0]
    @Param pbx_mode             : integer [Default 1]
    @Param call_center_mode     : integer [Default 1]
    @Param call_report          : integer [Default 1]
    @Param login_logout_report  : integer [Default 1]
    @Param tenant_uuid          : string
    @Param ParseUUIDPipe        : To validate uuid
    @return success / error object  : { User role updated successfully / User role already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createUserRoleDto: CreateUserRoleDto) {
        return this.user_role.update(id, createUserRoleDto);
    }

    @Patch(':uuid')
    @putDecoraters("User role status update successfully", "Update single user role status using uuid")

    /*
    @Usage               : Update single user role using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : User role status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.user_role.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("User role deleted successfully", "Delete single or multiple user role using uuid")

    /*
    @Usage               : Delete single or multiple user role using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single user role pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { User role deleted successfully / User role not found}
    */

    remove(@Param('uuid') id: string) {
        return this.user_role.remove(id);
    }

}