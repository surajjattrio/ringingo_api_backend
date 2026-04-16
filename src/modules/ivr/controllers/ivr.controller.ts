import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateIvrDto } from "../dto/create-ivr.dto";
import { IvrService } from '../services/ivr.service';

@Controller("ivr")

/*@Usage : To provide title of API in swagger */
@ApiTags("IVR")

export class IvrController {

    constructor(private readonly ivr: IvrService) { }

@Post()
@jsonDecorator("IVR created successfully", "Create a new IVR")

/*
@Usage                          : To create new IVR
@Method                         : POST
@Param name                     : string
@Param status                   : number[Default 0]
@Param welcome_greetings_uuid   : string
@Param invalid_greetings_uuid   : string
@Param invalid_retries          : string 
@Param exit_greetings_uuid      : string
@Param invalid_retries          : string 
@Param timeout                  : string 
@Param user_uuid                : string 
@Param digits                   : string 
@Param routing_type             : string 
@Param routing_options          : string 
@Param tenant_uuid              : string
@return success / error object  : { Ivr created successfully / Ivr already exist}
*/

    create(@Body() createIvrDto: CreateIvrDto) {
        return this.ivr.create(createIvrDto);
    }
    
@Get()
@getDecoraters("Retrieved all ivr successfully", "List all ivr")

/*
@Usage  : List all ivr
@Method : GET
@return : Array of an object with total count of ivr with data
*/

    findAll(@Query() queryParam) {
        return this.ivr.findAll(queryParam);
    }

@Get(':uuid')
@getDecoraters("Retrieved single ivr successfully", "List single ivr using uuid")

/*
@Usage               : List single ivr using uuid
@Method              : GET
@Param  uuid         : string
@Param ParseUUIDPipe : To validate uuid
@return object       : Full detail of particular uuid ivr
*/

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.ivr.findOne(id);
    }

@Put(':uuid')
@putDecoraters("ivr update successfully", "Update single ivr using uuid")

/*
@Usage                          : Update single ivr using uuid
@Method                         : PUT
@Param name                     : string
@Param status                   : number[Default 0]
@Param welcome_greetings_uuid   : string
@Param invalid_greetings_uuid   : string
@Param invalid_retries          : string 
@Param exit_greetings_uuid      : string
@Param invalid_retries          : string 
@Param timeout                  : string 
@Param user_uuid                : string 
@Param digits                   : string 
@Param routing_type             : string 
@Param routing_options          : string 
@Param tenant_uuid              : string
@Param ParseUUIDPipe            : To validate uuid
@return success / error object  : { Ivr updated successfully / name already exist}
*/

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() CreateIvrDto: CreateIvrDto) {
        return this.ivr.update(id, CreateIvrDto);
    }

@Patch(':uuid')
@putDecoraters("Ivr status update successfully", "Update single ivr status using uuid")

/*
@Usage               : Update single ivr using uuid
@Method              : PATCH
@Param ParseUUIDPipe : To validate uuid
@Param               : Single or multiple params will receive here
@return string       : Ivr status updated successfully
*/

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.ivr.patch(id, patchDto);
    }

@Delete(':uuid')
@deleteDecoraters("Ivr deleted successfully", "Delete single or multiple ivr using uuid")

/*
@Usage               : Delete single or multiple ivr using uuid
@Method              : DELETE
@Param  uuid         : To delete single ivr pass one uuid , for multiple pass comma separated uuids without space
@Param ParseUUIDPipe : To validate uuid
@return success / error object  : { Ivr deleted successfully / Ivr not found}
*/

    remove(@Param('uuid') id: string) {
        return this.ivr.remove(id);
    }

@Post("/advanced-search")
@postDecoraters("Retrieved ivr successfully", "Advanced search for single or multiple filed")

/*
@Usage             : To search ivr
@Method            : POST
@Param number      : string
@Param user_uuid   : string
@Param timeout     : string
@Param status      : string
@return Object     : Array of an object with total count of ivr with data
*/

    advancedSearch(@Body() searchData) {
        return this.ivr.advancedSearch(searchData);
    }

}
