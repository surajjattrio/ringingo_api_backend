import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query , Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateFollowUpDto } from "../dto/create-follow-up.dto";
import { FollowUpService } from "../services/follow-up.service";
import { ArchiveFollowUpDto } from "../dto/archive-follow-up.dto";
import { ReadStatusDto } from "../dto/read-status.dto";

@Controller("follow-up")

/*@Usage : To provide title of API in swagger */
@ApiTags("Follow up")

export class FollowUpController {

    /*
    @Usage  : To load follow up schema and other libraries
    @return : Object[follow_up] 
    */

    constructor(private readonly follow_up: FollowUpService) { }

    @Post()
    @postDecoraters("Follow up created successfully", "Create a new follow up")

    /*
    @Usage                          : To create new follow up
    @Method                         : POST
    @Param lead_management_uuid     : string
    @Param type                     : string
    @Param date_time                : string
    @Param assigned_to              : string
    @Param comment                  : string
    @return success / error object  : { Follow up created successfully / Follow up already exist}
    */

    create(@Body() createFollowUpDto: CreateFollowUpDto) {
        return this.follow_up.create(createFollowUpDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved follow up successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search follow up
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of follow up with data
    */

    advancedSearch(@Body() searchData) {
        return this.follow_up.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all follow up successfully", "List all follow up")

    /*
    @Usage  : List all follow up
    @Method : GET
    @return : Array of an object with total count of follow up with data
    */

    findAll(@Query() queryParam) {
        return this.follow_up.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single follow up successfully", "List single follow up using uuid")

    /*
    @Usage               : List single follow up using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid conference
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.follow_up.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Follow up update successfully", "Update single follow up using uuid")

    /*
    @Usage                          : Update single follow up using uuid
    @Method                         : PUT
    @Param lead_management_uuid     : string
    @Param type                     : string
    @Param date_time                : string
    @Param assigned_to              : string
    @Param comment                  : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Follow up updated successfully / Follow up already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createFollowUpDto: CreateFollowUpDto) {
        return this.follow_up.update(id, createFollowUpDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Follow up deleted successfully", "Delete single or multiple follow up using uuid")

    /*
    @Usage               : Delete single or multiple follow up using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single follow up pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Follow up deleted successfully / Follow up not found}
    */

    remove(@Param('uuid') id: string) {
        return this.follow_up.remove(id);
    }


    @Post('archive')
    @deleteDecoraters("Follow up archived successfully", "Delete single or multiple follow up using uuid")

    /*
    @Usage               : Delete single or multiple follow up using uuid
    @Method              : DELETE
    @Param  uuid         : Archive same record
    @return success / error object  : { Archived follow up successfully / Unable to archive follow up}
    */

    moveFollowUpToArchive(@Body() archiveFollowUpDto: ArchiveFollowUpDto) {
        return this.follow_up.moveFollowUpToArchive(archiveFollowUpDto);
    }

    @Get('lead/:lead_management_uuid')
    @getDecoraters("Retrieved all follow up successfully", "List all follow up using lead uuid")

    /*
    @Usage               : List all follow up of lead
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of follow up of particular lead
    */

    getFollowUpsOfLead(@Param('lead_management_uuid', new ParseUUIDPipe({ version: '4' })) id: string,@Query() queryParam) {
        return this.follow_up.getFollowUpsOfLead(id,queryParam);
    }

    @Patch(':uuid')
    @putDecoraters("Follow up update successfully", "Update single follow up using uuid")

    /*
    @Usage               : Update single follow up using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Follow up updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() readDto : ReadStatusDto) {
        return this.follow_up.patch(id, readDto);
    }

    @Get("rescheduled/:uuid")
    @getDecoraters("Retrieved rescheduled follow up successfully", "List rescheduled follow up using uuid")

    /*
    @Usage               : List rescheduled follow up based on follow up uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of rescheduled follow up's
    */

    fetchRescheduledHistory(@Param("uuid", new ParseUUIDPipe({ version: "4" })) id: string) {
      return this.follow_up.findOne(id, true);
    }
}
