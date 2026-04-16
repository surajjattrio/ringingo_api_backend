import { Controller, Get, Post, Body, Delete, Put, Param, ParseUUIDPipe, Query, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from 'src/swagger/swagger_decoraters';
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { CreateManagerDto } from 'src/modules/manager/dto/create-manager.dto';
import { ManagerService } from '../services/manager.service';

@Controller('manager')

/*@Usage : To provide title of API in swagger */
@ApiTags('Manager')

export class ManagerController {

    /*
    @Usage  : To load manager service and other libraries
    @return : Object[manager] 
    */

    constructor(private readonly manager: ManagerService) { }

    @Post()
    @postDecoraters("Manager created successfully", "Create a new manager")

    /*
    @Usage                          : To create new manager
    @Method                         : POST
    @Param first_name               : string
    @Param last_name                : string
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param status                   : string
    @Param manager_role_uuid        : string
    @Param extension_uuid           : string
    @return success / error object  : { Manager created successfully / Manager already exist}
    */

    create(@Body() createManagerDto: CreateManagerDto) {
        return this.manager.create(createManagerDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved managers successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search managers
    @Method            : POST
    @Param             : Single or multiple param receive here
    @return Object     : Array of an object with total count of manager with data
    */

    advancedSearch(@Body() searchData) {
        return this.manager.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all managers successfully", "List all managers")

    /*
    @Usage  : List all managers
    @Method : GET
    @return : Array of an object with total count of managers with data
    */

    findAll(@Query() queryParam) {
        return this.manager.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single manager successfully", "List single manager using uuid")

    /*
    @Usage                : List single manager using uuid
    @Method               : GET
    @Param  uuid          : string
    @Param  ParseUUIDPipe : To validate uuid
    @return object        : Full detail of particular uuid manager
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.manager.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Manager update successfully", "Update single manager using uuid")

    /*
    @Usage                          : Update single manager using uuid
    @Method                         : PUT
    @Param first_name               : string
    @Param last_name                : string
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param status                   : string
    @Param manager_role_uuid        : string
    @Param extension_uuid           : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Manager updated successfully / Manager already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createManagerDto: CreateManagerDto) {
        return this.manager.update(id, createManagerDto);
    }

    @Patch(':uuid')
    @putDecoraters("Manager status update successfully", "Update single manager status using uuid")

    /*
    @Usage               : Update single manager using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param patchDto      : Status of manager [Active / Inactive]
    @return string       : Manager status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.manager.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Manager deleted successfully", "Delete single or multiple Manager using uuid")

    /*
    @Usage                          : Delete single or multiple manager using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single manager pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Manager deleted successfully / Manager not found}
    */

    remove(@Param('uuid') id: string) {
        return this.manager.remove(id);
    }
}
