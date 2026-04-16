import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateTimezoneDto } from "../dto/create-timezone-dto";
import { TimezoneService } from "../services/timezone.service";

@Controller("timezone")
@ApiTags("Timezone")

export class TimezoneController {

    constructor(private readonly timezone: TimezoneService) { }

    @Post()
    @postDecoraters("Timezone created successfully", "Create a new timezone")

    /*
    @Usage : To create new timezone
    @Method : POST
    @Param gmttime: string
    @Param gmtoffset: string
    @Param timezone_name: string
    @Param timezone_digit: string
    @return success / error object  : { Timezone created successfully / Timezone already exist}
    */

    create(@Body() createTimezoneDto: CreateTimezoneDto) {
        return this.timezone.create(createTimezoneDto);
    }

    @Get()
    @getDecoraters("Retrieved all timezone successfully", "List all timezone")

    /*
    @Usage : List all timezone
    @Method : GET
    @return array of an object with total count of timezone with data
    */

    findAll(@Query() queryParam) { return this.timezone.findAll(queryParam); }

    @Get(':uuid')
    @getDecoraters("Retrieved single timezone successfully", "List single timezone using uuid")

    /*
    @Usage : List single timezone using uuid
    @Method : GET
    @Param  uuid : string
    @return object : Full detail of particular uuid timezone
    */

    findOne(@Param('uuid' , new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.timezone.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Timezone update successfully", "Update single timezone using uuid")

    /*
    @Usage : Update single timezone using uuid
    @Method : PUT
    @Param gmttime: string
    @Param gmtoffset: string
    @Param timezone_name: string
    @Param timezone_digit: string
    @return success / error object  : { Timezone updated successfully / Timezone already exist}
    */

    update(@Param('uuid' , new ParseUUIDPipe({ version: '4' })) id: string, @Body() createTimezoneDto: CreateTimezoneDto) {
        return this.timezone.update(id, createTimezoneDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Timezone deleted successfully", "Delete single timezone using uuid")

    /*
    @Usage : Delete single timezone using uuid
    @Method : DELETE
    @Param  uuid : string
    @return success / error object  : { Timezone deleted successfully / Timezone Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.timezone.remove(id);
    }

    @Patch(':uuid')
    @putDecoraters("Timezone status update successfully", "Update single timezone status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Timezone status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.timezone.patch(id, patchDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved timezone successfully", "Advanced search for single or multiple filed")

    /*
    @Usage                   : To search did
    @Method                  : POST
    @Param gmttime           : string
    @Param gmtoffset         : string
    @Param timezone_name     : string
    @Param timezone_digit    : string
    @return Object           : Array of an object with total count of timezone with data
    */

    advancedSearch(@Body() searchData) {
        return this.timezone.advancedSearch(searchData);
    }
}
