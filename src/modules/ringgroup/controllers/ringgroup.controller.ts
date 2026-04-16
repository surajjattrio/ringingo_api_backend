import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateRinggroupDto } from "../dto/create-ringgroup.dto";
import { RinggroupService } from '../services/ringgroup.service';


@Controller("ringgroup")
@ApiTags("Ringgroup")

export class RinggroupController {

    constructor(private readonly ringgroup: RinggroupService) { }

    @Post()
    @jsonDecorator("Ringgroup created successfully", "Create a new Ringgroup")

    /*
    @Usage                          : To create new Ringgroup
    @Method                         : POST
    @Param name                     : string
    @Param user_uuid                : string
    @Param type                     : number
    @Param status                   : number[Default 0]
    @Param timeout                  : number[Default 0]
    @Param extension_list           : string
    @Param tenant_uuid              : string
    @Param greeting_uuid            : string
    @return success / error object  : { Ringgroup created successfully / Ringgroup already exist}
    */

    create(@Body() createRinggroupDto: CreateRinggroupDto) {
        return this.ringgroup.create(createRinggroupDto);
    }

    @Get()
    @getDecoraters("Retrieved all ringgroup successfully", "List all ringgroup")

    /*
    @Usage : List all ringgroup
    @Method : GET
    @return array of an object with total count of ringgroup with data
    */

    findAll(@Query() queryParam) {
        return this.ringgroup.findAll(queryParam);
    }


    @Get(':uuid')
    @getDecoraters("Retrieved single ringgroup successfully", "List single ringgroup using uuid")

     /*
    @Usage               : List single ringgroup using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid ringgroup
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.ringgroup.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("ringgroup update successfully", "Update single ringgroup using uuid")

    /*
    @Usage               : Update single ringgroup using uuid
    @Method              : PUT
    @Param number        : string
    @Param user          : string
    @Param timeout       : string
    @Param status        : integer [Default 0]
    @Param codec         : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Ringgroup updated successfully / number already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() CreateRinggroupDto: CreateRinggroupDto) {
        return this.ringgroup.update(id, CreateRinggroupDto);
    }

    @Patch(':uuid')
    @putDecoraters("Ringgroup status update successfully", "Update single ringgroup status using uuid")

    /*
    @Usage               : Update single ringgroup using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Ringgroup status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.ringgroup.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Ringgroup deleted successfully", "Delete single or multiple ringgroup using uuid")
  
    /*
    @Usage               : Delete single or multiple ringgroup using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single ringgroup pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Ringgroup deleted successfully / ringgroup not found}
    */
  
    remove(@Param('uuid') id: string) {
      return this.ringgroup.remove(id);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved ringgroup successfully", "Advanced search for single or multiple filed")
  
    /*
    @Usage             : To search ringgroup
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of ringgroup with data
    */
    
    advancedSearch(@Body() searchData) {
      return this.ringgroup.advancedSearch(searchData);
    }
}
