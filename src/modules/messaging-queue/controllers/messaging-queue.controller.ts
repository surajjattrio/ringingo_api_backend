import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateMessagingQueueDto } from "../dto/create-messaging-queue.dto";
import { MessagingQueueService } from '../services/messaging-queue.service';
import { AssignExtensionDto } from "../dto/assign-extension.dto";

@Controller( "messaging-queue" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Messaging queue" )

export class MessagingQueueController {

    constructor( private readonly messaging_queue: MessagingQueueService ) { }

    @Post()
    @jsonDecorator( "Messaging queue created successfully", "Create a new Messaging queue" )

    /*
    @Usage                          : To create new Messaging queue
    @Method                         : POST
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param tenant_uuid              : string
    @return success / error object  : { MessagingQueue created successfully / MessagingQueue already exist}
    */

    create ( @Body() createMessagingQueueDto: CreateMessagingQueueDto ) {
        return this.messaging_queue.create( createMessagingQueueDto );
    }

    @Get()
    @getDecoraters( "Retrieved all Messaging queue successfully", "List all Messaging queue" )

    /*
    @Usage  : List all messaging-queue
    @Method : GET
    @return : Array of an object with total count of messaging-queue with data
    */

    findAll ( @Query() queryParam ) {
        return this.messaging_queue.findAll( queryParam );
    }

    @Get( ':uuid' )
    @getDecoraters( "Retrieved single Messaging queue successfully", "List single Messaging queue using uuid" )

    /*
    @Usage               : List single messaging-queue using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid Messaging queue
    */

    findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
        return this.messaging_queue.findOne( id );
    }

    @Put( ':uuid' )
    @putDecoraters( "Messaging queue update successfully", "Update single Messaging queue using uuid" )

    /*
    @Usage                          : Update single Messaging queue using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param tenant_uuid              : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { MessagingQueue updated successfully / name already exist}
    */

    update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() CreateMessagingQueueDto: CreateMessagingQueueDto ) {
        return this.messaging_queue.update( id, CreateMessagingQueueDto );
    }

    @Patch( ':uuid' )
    @putDecoraters( "Messaging queue status update successfully", "Update single messaging queue status using uuid" )

    /*
    @Usage               : Update single Messaging queue using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : MessagingQueue status updated successfully
    */

    patch ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
        return this.messaging_queue.patch( id, patchDto );
    }

    @Delete( ':uuid' )
    @deleteDecoraters( "Messaging queue deleted successfully", "Delete single or multiple Messaging queue using uuid" )

    /*
    @Usage               : Delete single or multiple Messaging queue using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single Messaging queue pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Messaging queue deleted successfully / Messaging queue not found}
    */

    remove ( @Param( 'uuid' ) id: string ) {
        return this.messaging_queue.remove( id );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved Messaging queue successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search Messaging queue
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of Messaging queue with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.messaging_queue.advancedSearch( searchData );
    }

    @Post( '/assign_extension' )
    @jsonDecorator( "extension assigned successfully", "Assign extension to single or multiple" )
    /*
    @Usage                     : Assign extension to single or multiple tenant using uuid
    @Method                    : PATCH
    @Param extensions_uuid      : string
    @Param ParseUUIDPipe       : To validate uuid
    @return success / error object  : { extension assigned successfully / extension assigned failed due to tenant not found }
    */
    assignExtension ( @Body() assignExtensionDto: AssignExtensionDto ) {
        console.log( assignExtensionDto );
        return this.messaging_queue.assignExtension( assignExtensionDto );
    }
    // assignExtension ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() assignExtensionDto: AssignExtensionDto ) {
    //     return this.messaging_queue.assignExtension( id, assignExtensionDto );
    // }


}
