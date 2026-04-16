import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateConferenceDto } from "../dto/create-conference.dto";
import { ConferenceService } from "../services/conference.service";
import { Public } from "src/global_constant";

@Controller("conference")

/*@Usage : To provide title of API in swagger */
@ApiTags("Conference")
export class ConferenceController {

    /*
    @Usage  : To load conference service and other libraries
    @return : Object[conference] 
    */

    constructor(private readonly conference: ConferenceService) { }

    @Post()
    @postDecoraters("Conference created successfully", "Create a new conference")

    /*
    @Usage                          : To create new conference
    @Method                         : POST
    @Param name                     : string
    @Param user_uuid                : string
    @Param status                   : string[Default 0]
    @Param greeting_uuid            : string
    @Param tenant_uuid              : string
    @Param pin                      : string
    @Param type                     : string[Default 0]
    @return success / error object  : { Conference created successfully / Conference already exist}
    */

    create(@Body() createConferenceDto: CreateConferenceDto) {
        return this.conference.create(createConferenceDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved tenants successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search tenant
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of conference with data
    */

    advancedSearch(@Body() searchData) {
        return this.conference.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all conference successfully", "List all conference")

    /*
    @Usage  : List all conference
    @Method : GET
    @return : Array of an object with total count of conference with data
    */

    findAll(@Query() queryParam) {
        return this.conference.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single conference successfully", "List single conference using uuid")

    /*
    @Usage               : List single conference using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid conference
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.conference.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Conference update successfully", "Update single conference using uuid")

    /*
    @Usage                          : Update single conference using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param user_uuid                : string
    @Param status                   : string[Default 0]
    @Param greeting_uuid            : string
    @Param tenant_uuid              : string
    @Param pin                      : string
    @Param type                     : string[Default 0]
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Conference updated successfully / Conference already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createConferenceDto: CreateConferenceDto) {
        return this.conference.update(id, createConferenceDto);
    }

    @Patch(':uuid')
    @putDecoraters("Conference status update successfully", "Update single conference status using uuid")

    /*
    @Usage               : Update single conference using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Conference status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.conference.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Conference deleted successfully", "Delete single or multiple conference using uuid")

    /*
    @Usage               : Delete single or multiple conference using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single conference pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Conference deleted successfully / Conference not found}
    */

    remove(@Param('uuid') id: string) {
        return this.conference.remove(id);
    }

    @Public()
    @Post("kill-uuid")
    @postDecoraters("UUID killed successfully", "To kill conference uuid")

    /*
    @Usage             : To kill conference uuid
    @Method            : POST
    @Param uuid        : uuid of conference
    @return Object     : Success / Error
    */

    killConferenceUUID(@Body() requestDto) {
        return this.conference.killConferenceUUID(requestDto);
    }

    @Public()
    @Post("send-dtmf")
    @postDecoraters("DTMF sent successfully", "To send DTMF")

    /*
    @Usage             : To send DTMF
    @Method            : POST
    @return Object     : Success / Error
    */

    sendDTMF(@Body() requestDto) {
        return this.conference.sendDTMF(requestDto);
    }
}
