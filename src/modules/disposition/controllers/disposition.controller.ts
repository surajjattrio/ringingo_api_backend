import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DispositionService } from "../services/disposition.service";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateDispositionDto } from "../dto/create-disposition.dto";
import { PatchDto } from "src/modules/common/dto/patch.dto";

@Controller("disposition")

/*@Usage : To provide title of API in swagger */
@ApiTags("Disposition")

export class DispositionController {

    /*
    @Usage  : To load disposition schema and other libraries
    @return : Object[disposition] 
    */

    constructor(private readonly disposition: DispositionService) { }

    @Post()
    @postDecoraters("Disposition created successfully", "Create a new disposition")

    /*
    @Usage                          : To create new disposition
    @Method                         : POST
    @Param name                     : string
    @Param code                     : string
    @Param status                   : string
    @return success / error object  : { Disposition created successfully / Disposition already exist}
    */

    create(@Body() createDispositionDto: CreateDispositionDto) {
        return this.disposition.create(createDispositionDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved disposition successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search disposition
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of disposition with data
    */

    advancedSearch(@Body() searchData) {
        return this.disposition.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all disposition successfully", "List all disposition")

    /*
    @Usage  : List all disposition
    @Method : GET
    @return : Array of an object with total count of disposition with data
    */

    findAll(@Query() queryParam) {
        return this.disposition.findAll(queryParam);
    }

    // new 
    @Get("/parent")
    @getDecoraters("Retrieved all parent disposition successfully", "List all parent disposition")

    /*
    @Usage  : List all parent disposition
    @Method : GET
    @return : Array of an object with total count of disposition with data
    */

    findParentDisposition(@Query() queryParam) {
        return this.disposition.findParentDisposition(queryParam);
    }

    @Get("/parent/:uuid")
    @getDecoraters("Retrieved single parent disposition successfully", "List all parent disposition")

    /*
    @Usage  : List single disposition parent disposition
    @Method : GET
    @return : Array of an object with total count of disposition with data
    */

    findOneParentDisposition(@Param() params, @Query() queryParam) {
        const { uuid } = params;
        return this.disposition.findOneParentDisposition(uuid, queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single disposition successfully", "List single disposition using uuid")

    /*
    @Usage               : List single disposition using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid disposition
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.disposition.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Disposition update successfully", "Update single disposition using uuid")

    /*
    @Usage                          : Update single disposition using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param code                     : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Disposition updated successfully / Disposition already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createDispositionDto: CreateDispositionDto) {
        return this.disposition.update(id, createDispositionDto);
    }

    @Patch(':uuid')
    @putDecoraters("Disposition status update successfully", "Update single disposition status using uuid")

    /*
    @Usage               : Update single disposition using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Disposition status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.disposition.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Disposition deleted successfully", "Delete single or multiple disposition using uuid")

    /*
    @Usage                          : Delete single or multiple disposition using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single disposition pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Disposition deleted successfully / Disposition not found}
    */

    remove(@Param('uuid') id: string) {
        return this.disposition.remove(id);
    }
}