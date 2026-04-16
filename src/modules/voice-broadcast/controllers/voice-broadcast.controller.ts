import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateVoiceBroadcastDto } from "../dto/create-voice-broadcast.dto";
import { VoiceBroadcastService } from "../services/voice-broadcast.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { VoiceBroadcastLeadGroupDto } from "../dto/voice-broadcast-lead-group.dto";
import { StartBroadcastDto } from "../dto/start-broadcast.dto";
import { DeleteLeadGroupDto } from "../dto/delete-lead-group.dto";

@Controller('voice-broadcast')

/*@Usage : To provide title of API in swagger */
@ApiTags("Voice Broadcast")

export class VoiceBroadcastController {

    /*
    @Usage  : To load voice broadcast service and other libraries
    @return : Object[voice_broadcast] 
    */

    constructor(private readonly voice_broadcast: VoiceBroadcastService) { }

    @Post()
    @jsonDecorator("Voice broadcast created successfully", "Create a voice broadcast")

    /*
    @Usage                          : To create voice broadcast
    @Method                         : POST
    @Param name                     : string
    @Param lead_group_uuid          : string
    @Param caller_id                : string
    @Param channel                  : string
    @Param recording                : string
    @Param max_retries              : integer
    @Param max_retries_disposition  : string
    @Param status                   : string
    @Param amd                      : string
    @Param recording                : string
    @Param start_schedule           : date
    @Param end_schedule             : date
    @Param welcome_prompt_uuid      : string
    @Param exit_prompt_uuid         : string
    @Param broadcast_type           : string
    @return success / error object  : { Voice broadcast created successfully / Voice broadcast already exist }
    */

    create(@Body() createVoiceBroadcastDto: CreateVoiceBroadcastDto) {
        return this.voice_broadcast.create(createVoiceBroadcastDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved voice broadcast successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search voice broadcast
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of voice broadcast with data
    */

    advancedSearch(@Body() searchData) {
        return this.voice_broadcast.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all voice broadcast successfully", "List all voice broadcast")

    /*
    @Usage  : List all voice broadcast
    @Method : GET
    @return : Array of an object with total count of voice broadcast with data
    */

    findAll(@Query() queryParam) {
        return this.voice_broadcast.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single voice broadcast successfully", "List single voice broadcast using uuid")

    /*
    @Usage               : List single voice broadcast using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid voice broadcast
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.voice_broadcast.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Voice broadcast update successfully", "Update single voice broadcast using uuid")

    /*
    @Usage                          : To update voice broadcast
    @Method                         : POST
    @Param name                     : string
    @Param lead_group_uuid          : string
    @Param caller_id                : string
    @Param channel                  : string
    @Param recording                : string
    @Param max_retries              : integer
    @Param max_retries_disposition  : string
    @Param status                   : string
    @Param amd                      : string
    @Param recording                : string
    @Param start_schedule           : date
    @Param end_schedule             : date
    @Param welcome_prompt_uuid      : string
    @Param exit_prompt_uuid         : string
    @Param broadcast_type           : string
    @return success / error object  : { Voice broadcast created successfully / Voice broadcast already exist }
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createVoiceBroadcastDto: CreateVoiceBroadcastDto) {
        return this.voice_broadcast.update(id, createVoiceBroadcastDto);
    }

    @Patch(':uuid')
    @putDecoraters("Voice broadcast status update successfully", "Update single voice broadcast status using uuid")

    /*
    @Usage               : Update single voice broadcast using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Voice broadcast status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.voice_broadcast.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Voice broadcast deleted successfully", "Delete single or multiple voice broadcast using uuid")

    /*
    @Usage               : Delete single or multiple voice broadcast using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single voice broadcast pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Voice broadcast deleted successfully / Voice broadcast not found}
    */

    remove(@Param('uuid') id: string) {
        return this.voice_broadcast.remove(id);
    }

    @Post("/reset-leads")
    @postDecoraters("Lead group added successfully", "To reset lead group")

    /*
    @Usage             : To add lead group
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of voice broadcast with data
    */

    resetLeads(@Body() voiceBroadcastLeadGroupDto: VoiceBroadcastLeadGroupDto) {
        return this.voice_broadcast.resetLeads(voiceBroadcastLeadGroupDto);
    }

    @Get("list/lead-group/:campaign_uuid")
    @getDecoraters("Retrieved all lead group successfully", "List all lead group")

    /*
    @Usage  : List all lead group
    @Method : GET
    @return : Array of an object with total count of lead group with data
    */

    fetchLeadGroup(@Param() params: any, @Query() queryParam) {
        const { campaign_uuid } = params;
        return this.voice_broadcast.getLeads(queryParam, campaign_uuid);
    }

    @Patch("broadcast/:feature")
    @postDecoraters("Voice broadcast start/stop successfully", "To start a voice broadcast")

    /*
    @Usage         : To start/stop a voice broadcast
    @Method        : POST
    @return Object : Success / Error
    */

    broadcast(@Body() startBroadcastDto: StartBroadcastDto, @Param('feature') param, @Req() req) {
        const { uuid } = req.user;
        startBroadcastDto.tenant_uuid = uuid;
        switch (param) {
            case "in-progress":
                return this.voice_broadcast.updateBroadcastStatus(startBroadcastDto,param);
                break;
            case "stop":
                return this.voice_broadcast.updateBroadcastStatus(startBroadcastDto,param);
                break;
	    case "fetch-count":
                return  this.voice_broadcast.fetchCount(startBroadcastDto);
                break;
        }
    }

    @Post("lead-group")
    @postDecoraters("Lead group deleted successfully", "To delete lead group")

    /*
    @Usage                 : To delete lead group
    @Method                : POST
    @Param lead_group_uuid : uuid of lead group
    @Param campaign_uuid   : uuid of broadcast
    @return Object         : Array of an object with total count of voice broadcast with data
    */

    removeLeadGroup(@Body() deleteLeadGroupDto: DeleteLeadGroupDto) {
        return this.voice_broadcast.removeLeadGroup(deleteLeadGroupDto);
    }
}

