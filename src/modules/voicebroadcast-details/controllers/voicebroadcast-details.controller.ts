import { Body, Controller, Get, Post, Query, Req , Param , ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { VoicebroadcastdetailsService } from "../services/voicebroadcast-details.service";

@Controller("voicebroadcast_details")

/*@Usage : To provide title of API in swagger */
@ApiTags("Voicebroadcast_details")

export class VoicebroadcastdetailsController {

    /*
    @Usage  : To load Voicebroadcast details service and other libraries
    @return : Object[Voicebroadcast details] 
    */

    constructor(private readonly voicebroadcast_details: VoicebroadcastdetailsService) { }

    @Post("/advanced-search")
    @postDecoraters("Retrieved Voicebroadcast details successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search Voicebroadcast details
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of Voicebroadcast details with data
    */

    advancedSearch(@Body() searchData) {
        return this.voicebroadcast_details.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all Voicebroadcast details successfully", "List all Voicebroadcast details")

    /*
    @Usage  : List all Voicebroadcast details
    @Method : GET
    @return : Array of an object with total count of Voicebroadcast details with data
    */

    findAll(@Query() queryParams) {
        return this.voicebroadcast_details.findAll(queryParams);
    }


    @Get('survey/:uuid')

    @getDecoraters("Retrieved single Voicebroadcast details successfully", "List single Voicebroadcast details using uuid")



    /*

    @Usage               : List single Voicebroadcast details using uuid

    @Method              : GET

    @Param  uuid         : string

    @Param ParseUUIDPipe : To validate uuid

    @return object       : Full detail of particular uuid Voicebroadcast details

    */



    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {

        return this.voicebroadcast_details.findOne(id);

    }

   
}
