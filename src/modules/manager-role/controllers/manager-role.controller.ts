import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateManagerRoleDto } from "../dto/create-manager-role.dto";
import { ManagerRoleService } from "../services/manager-role.service";

@Controller("manager-role")

/*@Usage : To provide title of API in swagger */
@ApiTags("Manager Role")

export class ManagerRoleController {

    /*
    @Usage  : To load manager role service and other libraries
    @return : Object[manager_role] 
    */

    constructor(private readonly manager_role: ManagerRoleService) { }

    @Post()
    @jsonDecorator("Manager role created successfully", "Create a new manager role")

    /*
    @Usage                          : To create manager role
    @Method                         : POST
    @Param role_name                : string
    @Param status                   : string
    @Param module_permission        : nested object
    @return success / error object  : { Manager role created successfully / Manager role already exist}
    */

    create(@Body() createManagerRoleDto: CreateManagerRoleDto) {
        return this.manager_role.create(createManagerRoleDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved manager role successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search manager role
    @Method            : POST
    @Param             : Single or multiple param receive here
    @return Object     : Array of an object with total count of manager role with data
    */

    advancedSearch(@Body() searchData) {
        return this.manager_role.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all manager role successfully", "List all manager role")

    /*
    @Usage  : List all manager role
    @Method : GET
    @return : Array of an object with total count of manager role with data
    */

    findAll(@Query() queryParam) {
        return this.manager_role.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single manager role successfully", "List single manager role using uuid")

    /*
    @Usage                : List single manager role using uuid
    @Method               : GET
    @Param  uuid          : string
    @Param  ParseUUIDPipe : To validate uuid
    @return object        : Full detail of particular uuid manager role
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.manager_role.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Manager role update successfully", "Update single manager role using uuid")

    /*
    @Usage                          : Update single manager role using uuid
    @Method                         : PUT
    @Param role_name                : string
    @Param status                   : string
    @Param module_permission        : nested object
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Manager role updated successfully / Manager role already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createManagerRoleDto: CreateManagerRoleDto) {
        return this.manager_role.update(id, createManagerRoleDto);
    }

    @Patch(':uuid')
    @putDecoraters("Manager role status update successfully", "Update single manager role status using uuid")

    /*
    @Usage               : Update single manager role using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param patchDto      : Status of manager role [Active / Inactive]
    @return string       : Manager role status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.manager_role.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Manager role deleted successfully", "Delete single or multiple manager role using uuid")

    /*
    @Usage                          : Delete single or multiple manager role using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single manager role pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Manager role deleted successfully / Manager role not found}
    */

    remove(@Param('uuid') id: string) {
        return this.manager_role.remove(id);
    }
}
