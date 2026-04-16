import { Controller, Get, Post, Body, Delete, Put, Param, ParseUUIDPipe, Query, Patch, Req, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from 'src/swagger/swagger_decoraters';
import { CallForwardingDto } from '../dto/call-forwarding.dto';
import { CreateExtensionDto } from '../dto/create-extension-dto';
import { FollowMeDto } from '../dto/follow-me.dto';
import { SpeedDialDto } from '../dto/speed-dial.dto';
import { ExtensionInterceptor } from '../interceptors/extension.interceptor';
import { ExtensionService } from '../services/extension.service';

@Controller('extension')

/*@Usage : To provide title of API in swagger */
@ApiTags('Extension')

export class ExtensionController {

    /*
    @Usage  : To load extension service and other libraries
    @return : Object[extension] 
    */

    constructor(private readonly extension: ExtensionService) { }

    @Post()
    @postDecoraters("Extension created successfully", "Create a new extension")

    /*
    @Usage                  : To create new extension
    @Method                 : POST
    @Param device_name      : string
    @Param username         : string
    @Param password         : string
    @Param user             : string
    @Param status           : integer [Default 0]
    @Param recording        : integer [Default 0]
    @Param voicemail        : integer [Default 0]
    @Param caller_id_name   : string 
    @Param caller_id_number : string 
    @return success / error object  : { Extension created successfully / Extension already exist}
    */

    create(@Body() createExtensionDto: CreateExtensionDto) {
        return this.extension.create(createExtensionDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved extension successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search extension
    @Method            : POST
    @Param             : Single or multiple parameter
    @return Object     : Array of an object with total count of extension with data
    */

    advancedSearch(@Body() searchData) {
        return this.extension.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all extensions successfully", "List all extensions")

    /*
    @Usage  : List all extensions
    @Method : GET
    @return : Array of an object with total count of extensions with data
    */
    
    findAll(@Query() queryParam , @Req() req) {    
        return this.extension.findAll(queryParam,req.user);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single extension successfully", "List single extension using uuid")

    /*
    @Usage               : List single extension using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid extension
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.extension.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Extension update successfully", "Update single extension using uuid")

    /*
    @Usage                      : Update single extension using uuid
    @Method                     : PUT
    @Param device_name          : string
    @Param username             : string
    @Param password             : string
    @Param user_uuid            : string
    @Param status               : integer [Default 0]
    @Param recording            : integer [Default 0]
    @Param voicemail            : integer [Default 0]
    @Param caller_id_name       : string 
    @Param caller_id_number     : string 
    @Param tenant_uuid          : string
    @Param ParseUUIDPipe        : To validate uuid
    @return success / error object  : { Extension updated successfully / Extension already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createExtensionDto: CreateExtensionDto) {
        return this.extension.update(id, createExtensionDto);
    }

    @Patch(':uuid')
    @putDecoraters("Extension status update successfully", "Update single extension status using uuid")

    /*
    @Usage               : Update single extension using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Extension status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.extension.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Extension deleted successfully", "Delete single extension using uuid")

    /*
    @Usage               : Delete single extension using uuid
    @Method              : DELETE
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Extension deleted successfully / Extension Not found}
    */

    remove(@Param('uuid') id: string , @Req() req) {
        return this.extension.remove(id,req.user);
    }

    /* APIs of Other Features in sip devices/extension */

    @Put("/:feature/:uuid")
    @jsonDecorator("Update other feature of extension", "Update other feature of extension")

    /*
    @Usage                      : To update other feature of extension
    @Method                     : PATCH
    @Param call_forwarding      : Object (Details of call forwarding)
    @Param voicemail            : Object (Details of voicemail)
    @Param follow me            : Object (Details of follow me) 
    @Param dnd                  : Enable / Disable (default = enable) 
    @Param missed call alert    : Enable / Disable (default = enable) 
    @Param recording            : Enable / Disable (default = disable) 
    @return success / error object  : { Send response based on feature  / Extension not found}
    */

    updateExtensionFeature(@Param() params: any, @Body() requestDto) {
        let result;
        const { feature, uuid } = params;
	const { role, parent_uuid } = requestDto;
        switch (feature) {
            case "call-forwarding":
                const { call_forward } = requestDto;
                let logMessagesCallForwarding = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Call forwarding updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, call_forward, logMessagesCallForwarding, "call_forward",role, parent_uuid);
                break;
            case "voicemail":
                const { voicemail } = requestDto;
                let logMessagesVoicemail = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Voicemail updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, voicemail, logMessagesVoicemail, "voicemail",role, parent_uuid);
                break;
            case "speed-dial":
                const { speed_dial } = requestDto;
                let logMessagesSpeedDial = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Speed dial updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, speed_dial, logMessagesSpeedDial, "speed_dial",role, parent_uuid);
                break;
            case "follow-me":
                const { follow_me } = requestDto;
                let logMessagesFollowMe = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Follow me updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, follow_me, logMessagesFollowMe, "follow_me",role, parent_uuid);
                break;
            case "dnd":
                const { dnd } = requestDto;
                let logMessagesDnd = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `DND updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, dnd, logMessagesDnd, "dnd" , role, parent_uuid);
                break;
            case "missed-call-alert":
                const { mail_to } = requestDto;
                let logMessagesMailTo = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Missed call alert updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, mail_to, logMessagesMailTo, "mail_to",role, parent_uuid);
                break;
            case "recording":
                const { recording } = requestDto;
                let logMessagesRecording = {
                    logErrorMsg: `Extension not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Recording status updated successfully by uuid : ${uuid} \n`
                }
                result = this.extension.updateExtensionOtherFeature(uuid, recording, logMessagesRecording, "recording",role, parent_uuid);
                break;
        }
        return result;
    }
}

