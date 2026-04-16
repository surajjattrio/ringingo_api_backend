import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateCallQueueDto } from "../dto/create-call-queue.dto";
import { CallQueueService } from "../services/call-queue.service";

@Controller("call-queue")

/*@Usage : To provide title of API in swagger */
@ApiTags("Call Queue")

export class CallQueueController {

    /*
    @Usage  : To load call-queue service and other libraries
    @return : Object[call-queue] 
    */

    constructor(private readonly call_queue: CallQueueService) { }

    @Post()
    @jsonDecorator("Call queue created successfully", "Create a new call queue")

    /*
    @Usage                            : To create new call queue
    @Method                           : POST
    @Param name                       : string
    @Param status                     : string[Default 0]
    @Param strategy                   : string
    @Param tenant_uuid                : string
    @Param call_waiting_greeting_uuid : string
    @Param call_welcome_greeting_uuid : string
    @Param agent_info                 : Object[Agent informarion]
    @return success / error object    : { Call queue created successfully / Call queue already exist}
    */

    create(@Body() createQueueDto : CreateCallQueueDto) {
        return this.call_queue.create(createQueueDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved call queue successfully", "Advanced search for single or multiple filed")

    /*
    @Usage          : To search call queue
    @Method         : POST
    @Param          : Single or multiple parameters
    @return Object  : Array of an object with total count of tenants with data
    */

    advancedSearch(@Body() searchData) {
        return this.call_queue.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all call queue successfully", "List all call queue")

    /*
    @Usage  : List all call queue
    @Method : GET
    @return : Array of an object with total count of call queue with data
    */

    findAll(@Query() queryParam) {
        return this.call_queue.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single tenant successfully", "List single tenant using uuid")

    /*
    @Usage               : List single tenant using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid tenant
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.call_queue.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Call queue update successfully", "Update single call queue using uuid")

    /*
    @Usage                            : Update single call queue using uuid
    @Method                           : PUT
    @Param name                       : string
    @Param status                     : string[Default 0]
    @Param strategy                   : string
    @Param tenant_uuid                : string
    @Param call_waiting_greeting_uuid : string
    @Param call_welcome_greeting_uuid : string
    @Param agent_info                 : Object[Agent informarion]
    @Param ParseUUIDPipe              : To validate uuid
    @return success / error object    : { Call queue updated successfully / Call queue already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createQueueDto) {
        return this.call_queue.update(id, createQueueDto);
    }
    
    @Patch(':uuid')
    @putDecoraters("Call queue status update successfully", "Update single call queue status using uuid")

    /*
    @Usage               : Update single call queue using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Call queue status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.call_queue.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Call queue deleted successfully", "Delete single or multiple tenant using uuid")

    /*
    @Usage               : Delete single or multiple call queue using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single call queue pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Call queue deleted successfully / Call queue not found}
    */

    remove(@Param('uuid') id: string , @Req() req) {
	const { domain } = req.user;    
        return this.call_queue.remove(id,domain);
    }
}
