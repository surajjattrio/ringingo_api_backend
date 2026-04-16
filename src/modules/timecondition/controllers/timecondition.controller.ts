import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateTimeconditionDto } from "../dto/create-timecondition.dto";
import { TimeconditionService } from "../services/timecondition.service";

@Controller("timecondition")

/*@Usage : To provide title of API in swagger */
@ApiTags("Timecondition")

export class TimeconditionController {

    /*
    @Usage  : To load timecondition service and other libraries
    @return : Object[timecondition] 
    */

    constructor(private readonly timecondition: TimeconditionService) { }

    @Post()
    @jsonDecorator("Timecondition created successfully", "Create a new timecondition")

    /*
    @Usage                          : To create new timecondition
    @Method                         : POST
    @Param name                     : string
    @Param status                   : string
    @Param failover_routing_type    : string
    @Param failover_routing_option  : string
    @return success / error object  : { Timecondition created successfully / Timecondition already exist}
    */

    create(@Body() createTimeconditionDto: CreateTimeconditionDto) {
        return this.timecondition.create(createTimeconditionDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved timecondition successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search timecondition
    @Method            : POST
    @Param             : Single or multiple params for search
    @return Object     : Array of an object with total count of timecondition with data
    */

    advancedSearch(@Body() searchData) {
        return this.timecondition.advancedSearch(searchData);
    }


    @Get()
    @getDecoraters("Retrieved all timecondition successfully", "List all timecondition")

    /*
    @Usage   : List all timecondition
    @Method  : GET
    @return  : Array of an object with total count of timecondition with data
    */

    findAll(@Query() queryParams) {
        return this.timecondition.findAll(queryParams);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single timecondition successfully", "List single timecondition using uuid")

    /*
    @Usage          : List single timecondition using uuid
    @Method         : GET
    @Param  uuid    : string
    @return object  : Full detail of particular uuid timecondition
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.timecondition.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Timecondition update successfully", "Update single timecondition using uuid")


    /*
    @Usage                          : Update single timecondition using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param status                   : string
    @Param failover_routing_type    : string
    @Param failover_routing_option  : string
    @return success / error object  : { Timecondition updated successfully / Timecondition already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createTimeconditionDto: CreateTimeconditionDto) {
        return this.timecondition.update(id, createTimeconditionDto);
    }

    @Patch(':uuid')
    @putDecoraters("Timecondition status update successfully", "Update single Timecondition status using uuid")

    /*
    @Usage               : Update single Timecondition using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Timecondition status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.timecondition.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Timecondition deleted successfully", "Delete single timecondition using uuid")

    /*
    @Usage                          : Delete single or multiple timecondition using uuid
    @Method                         : DELETE
    @Param  uuid                    : string
    @return success / error object  : { Timecondition deleted successfully / Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.timecondition.remove(id);
    }
}