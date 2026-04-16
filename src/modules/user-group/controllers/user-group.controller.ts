import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateUserGroupDto } from "../dto/create-user-group.dto";
import { UserGroupService } from "../services/user-group.service";

@Controller("user-group")

/*@Usage : To provide title of API in swagger */
@ApiTags("User Group")

export class UserGroupController {

    /*
    @Usage  : To load user_group service and other libraries
    @return : Object[user_group] 
    */

    constructor(private readonly user_group: UserGroupService) { }

    @Post()
    @postDecoraters("User group created successfully", "Create a new user group")

    /*
    @Usage                            : To create new user group
    @Method                           : POST
    @Param name                       : string
    @Param status                     : string[Default 0]
    @Param outbound_rules             : string
    @Param user_uuid                  : Contains single or multiple uuid of user  
    @return success / error object    : { User group created successfully / User group already exist}
    */

    create(@Body() createUserGroupDto: CreateUserGroupDto) {
        return this.user_group.create(createUserGroupDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved user group successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search user group
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of user group with data
    */

    advancedSearch(@Body() searchData) {
        return this.user_group.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all user group successfully", "List all user group")

    /*
    @Usage  : List all user group
    @Method : GET
    @return : Array of an object with total count of user group with data
    */

    findAll(@Query() queryParam) {
        return this.user_group.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single user group successfully", "List single user group using uuid")

    /*
    @Usage               : List single user group using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid user group
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.user_group.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("User group update successfully", "Update single user group using uuid")

    /*
    @Usage                          : Update single user group using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param status                   : string[Default 0]
    @Param outbound_rules           : string
    @Param user_uuid                : Contains uuid of user  
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { User group updated successfully / User group already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createUserGroupDto: CreateUserGroupDto) {
        return this.user_group.update(id, createUserGroupDto);
    }

    @Patch(':uuid')
    @putDecoraters("User group status update successfully", "Update single user group status using uuid")

    /*
    @Usage               : Update single user group using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : User group status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.user_group.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("User group deleted successfully", "Delete single or multiple User group using uuid")

    /*
    @Usage               : Delete single or multiple user group using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single user group pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { User group deleted successfully / User group not found}
    */

    remove(@Param('uuid') id: string) {
        return this.user_group.remove(id);
    }
}

