import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateMessagingChannelDto } from "../dto/create-messaging-channel.dto";
import { MessagingChannelService } from '../services/messaging-channel.service';

@Controller( "messaging-channel" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Messaging channel" )

export class MessagingChannelController {

    constructor( private readonly messaging_channel: MessagingChannelService ) { }

    @Post()
    @jsonDecorator( "Messaging channel created successfully", "Create a new Messaging channel" )

    /*
    @Usage                          : To create new Messaging channel
    @Method                         : POST
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param tenant_uuid              : string
    @return success / error object  : { MessagingChannel created successfully / MessagingChannel already exist}
    */

    create ( @Body() createMessagingChannelDto: CreateMessagingChannelDto ) {
        return this.messaging_channel.create( createMessagingChannelDto );
    }

    @Get()
    @getDecoraters( "Retrieved all messaging channel successfully", "List all messaging channel" )

    /*
    @Usage  : List all messaging-channel
    @Method : GET
    @return : Array of an object with total count of messaging-channel with data
    */

    findAll ( @Query() queryParam ) {
        return this.messaging_channel.findAll( queryParam );
    }

    @Get( ':uuid' )
    @getDecoraters( "Retrieved single messaging channel successfully", "List single messaging channel using uuid" )

    /*
    @Usage               : List single messaging-channel using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid messaging channel
    */

    findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
        return this.messaging_channel.findOne( id );
    }

    @Put( ':uuid' )
    @putDecoraters( "messaging channel update successfully", "Update single messaging channel using uuid" )

    /*
    @Usage                          : Update single messaging channel using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param tenant_uuid              : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { MessagingChannel updated successfully / name already exist}
    */

    update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() CreateMessagingChannelDto: CreateMessagingChannelDto ) {
        return this.messaging_channel.update( id, CreateMessagingChannelDto );
    }

    @Patch( ':uuid' )
    @putDecoraters( "MessagingChannel status update successfully", "Update single messaging channel status using uuid" )

    /*
    @Usage               : Update single messaging channel using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : MessagingChannel status updated successfully
    */

    patch ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
        return this.messaging_channel.patch( id, patchDto );
    }

    @Delete( ':uuid' )
    @deleteDecoraters( "Messaging Channel deleted successfully", "Delete single or multiple messaging channel using uuid" )

    /*
    @Usage               : Delete single or multiple messaging channel using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single messaging channel pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Messaging Channel deleted successfully / Messaging Channel not found}
    */

    remove ( @Param( 'uuid' ) id: string ) {
        return this.messaging_channel.remove( id );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved messaging channel successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search messaging channel
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of messaging channel with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.messaging_channel.advancedSearch( searchData );
    }

    @Post( "/omni_list" )
    // @Post( "/whatsapp_list" )
    @postDecoraters( "Retrieved Whatsapp messaging channel successfully", "List Whatsapp messaging channel" )

    /*
    @Usage  : List all messaging-channel
    @Method : GET
    @return : Array of an object with total count of messaging-channel with data
    */

    omni_list ( @Body() queryParam ) {
        return this.messaging_channel.omni_list( queryParam );
    }

}
