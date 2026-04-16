import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateClickToCallDto } from "../dto/create-click-to-call.dto";
import { ForwordingClickToCallDto } from "../dto/forwarding-click-to-call.dto";
import { ClickToCallService } from "../services/click-to-call.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";

@Controller("click-to-call")

/*@Usage : To provide title of API in swagger */
@ApiTags("Click To Call")

export class ClickToCallController {

    /*
    @Usage  : To load click to call and other libraries
    @return : Object[click_to_call] 
    */

    constructor(
        private readonly click_to_call: ClickToCallService
    ) { }

    @Post()
    @postDecoraters("Click To Call created successfully", "Create a new click to call")

    /*
    @Usage                          : To create new click to call
    @Method                         : POST
    @Param name                     : string
    @Param status                   : string 
    @Param url                      : string
    @return success / error object  : { Click To Call created successfully / Click To Call already exist}
    */

    create(@Body() createClickToCallDto: CreateClickToCallDto) {
        return this.click_to_call.create(createClickToCallDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved Click To Call successfully", "Advanced search for single or multiple filed")

    /*
    @Usage          : To search click to call
    @Method         : POST
    @Param          : Single or multiple parameters
    @return Object  : Array of an object with total count of tenants with data
    */

    advancedSearch(@Body() searchData) {
        return this.click_to_call.advancedSearch(searchData);
    }

    @Patch('/forward/:uuid')
    @putDecoraters("Click To Call forward successfully", "Forward Click To Call")

    /*
    @Usage                          : Forwarding Click To Call
    @Method                         : POST
    @Param clicktocall_forwarding_type      : string
    @Param clicktocall_forwarding_value     : string
    @return success / error object  : { Click To Call forward successfully / Click To Call already forward exist}
    */

    forwarding(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() ForwordingClickToCallDto: ForwordingClickToCallDto) {
        return this.click_to_call.forwarding(id, ForwordingClickToCallDto);
    }

    @Post("/tts")
    @postDecoraters("TTS generated successfully", "Generate text to speech audio")
    generateTTS(@Body() body: any) {
        let text = body.text;
        if (!text) {
            const firstKey = Object.keys(body)[0];
            const parsed = JSON.parse(firstKey);
            text = parsed.text;
        }
        return this.click_to_call.generateTTS(text);
    }

    @Post("/broadcast")
    @postDecoraters("Broadcasted successfully", "Generate text to speech audio and call generate")
    clickToCallBroadcast(@Body() body: any, @Query() queryParam) {
        return this.click_to_call.clickToCallBroadcast(body, queryParam);
    }

    @Get()
    @getDecoraters("Retrieved all click to call successfully", "List all click to call")

    /*
    @Usage  : List all click to call
    @Method : GET
    @return : Array of an object with total count of click to call with data
    */

    findAll(@Query() queryParam) {
        return this.click_to_call.findAll(queryParam);
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
        return this.click_to_call.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Click To Call update successfully", "Update single click to call using uuid")

    /*
    @Usage                            : Update single click to call using uuid
    @Method                           : PUT
    @Param name                       : string
    @Param status                     : string 
    @Param url                        : string
    @Param ParseUUIDPipe              : To validate uuid
    @return success / error object    : { Click To Call updated successfully / Click To Call already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createClickToCallDto: CreateClickToCallDto) {
        return this.click_to_call.update(id, createClickToCallDto);
    }

    @Patch(':uuid')
    @putDecoraters("Click To Call status update successfully", "Update single click to call status using uuid")

    /*
    @Usage               : Update single click to call using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Click To Call status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.click_to_call.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Click To Call deleted successfully", "Delete single or multiple tenant using uuid")

    /*
    @Usage               : Delete single or multiple click to call using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single click to call pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Click To Call deleted successfully / Click To Call not found}
    */

    remove(@Param('uuid') id: string) {
        return this.click_to_call.remove(id);
    }
}