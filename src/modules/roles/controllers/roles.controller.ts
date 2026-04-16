import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateRolesDto } from "../dto/create-roles-dto";
import { RolesService } from "../services/roles.service";

@Controller("role")

/*@Usage : To provide title of API in swagger */
@ApiTags("Roles")

export class RolesController {

    /*
    @Usage  : To load role service and other libraries
    @return : Object[tenant] 
    */

    constructor(private readonly roles: RolesService) { }

    @Post()
    @jsonDecorator("Role created successfully", "Create a new role")

    /*
    @Usage                     : To create new role
    @Method                    : POST
    @Param role_name           : string
    @Param status: string
    @Param default_permission  : object
    @Param module_permission   : nested object
    @return success / error object  : { Role created successfully / Role already exist}
    */

    create(@Body() createRolesDto: CreateRolesDto) {
        return this.roles.create(createRolesDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved roles successfully", "Advanced search for particular filed")

    /*
    @Usage           : To search role
    @Method          : POST
    @Param role_name : string
    @return success / error object  : { Role retrieved successfully / Role not found }
    */

    advancedSearch(@Body() searchData) {
        return this.roles.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all roles successfully", "List all roles")

    /*
    @Usage   : List all roles
    @Method  : GET
    @return  : Array of an object with total count of roles with data
    */

    findAll(@Query() queryParam) {
        return this.roles.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single role successfully", "List single role using uuid")

    /*
    @Usage               : List single role using uuid
    @Method              :  GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid role
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.roles.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Role update successfully", "Update single role using uuid")

    /*
    @Usage                    : Update single role using uuid
    @Method                   : PUT
    @Param role_name          : string
    @Param status             : string
    @Param default_permission : object
    @Param module_permission  : nested object
    @Param ParseUUIDPipe      : To validate uuid
    @return success / error object  : { Role updated successfully / Role already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createRolesDto: CreateRolesDto) {
        return this.roles.update(id, createRolesDto);
    }

    @Patch(':uuid')
    @putDecoraters("Role status update successfully", "Update single role status using uuid")

    /*
    @Usage               : Update single role using uuid
    @Method              : PATCH
    @Param               : Single or multiple params will receive here
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Role status updated successfully / Role not found}
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.roles.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Role deleted successfully", "Delete single role using uuid")

    /*
    @Usage               : Delete single role using uuid
    @Method              : DELETE
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Role deleted successfully / Role Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.roles.remove(id);
    }
}