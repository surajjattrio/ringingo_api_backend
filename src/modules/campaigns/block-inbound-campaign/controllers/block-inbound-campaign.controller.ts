import { BadRequestException, Body, Controller, Delete, Get, Param, FileTypeValidator, ParseUUIDPipe, ParseFilePipe, UploadedFile, Req, Patch, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateInboundBlockCampaignDto } from "../dto/create-inbound-block-campaign.dto";
import { BlockInboundCampaignService } from "../services/block-inbound-campaign.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { BlockInboundCampaignImportDto } from "../dto/block-inbound-campaign-import.dto";

@Controller( "block-inbound-campaign" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Block Inbound Campaign" )

export class BlockInboundCampaignController {

    /*
    @Usage  : To load agent call center service and other libraries
    @return : Object[agent_call_center]
    */

    constructor(
        private readonly block_inbound_campaign: BlockInboundCampaignService
    ) {

    }

    @Post()
    @postDecoraters( "Block inbound campaign added successfully", "To add block inbound campaign" )

    /*
    @Usage                               : To add block inbound campaign
    @Method                              : POST
    @Param createInboundBlockCampaignDto : Request Dto
    @return string                       : Block inbound campaign added successfully
    */

    addBlockInboundCampaign ( @Body() createInboundBlockCampaignDto: CreateInboundBlockCampaignDto ) {
        return this.block_inbound_campaign.create( createInboundBlockCampaignDto );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved block inbound campaign successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search block inbound campaign
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of block inbound campaign with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.block_inbound_campaign.advancedSearch( searchData );
    }

    @Get()
    @getDecoraters( "Retrieved all block inbound campaign successfully", "List all block inbound campaign" )

    /*
    @Usage  : List all block inbound campaign
    @Method : GET
    @return : Array of an object with total count of block inbound campaign with data
    */

    findAll ( @Query() queryParam ) {
        return this.block_inbound_campaign.findAll( queryParam );
    }

    @Get( ':uuid' )
    @getDecoraters( "Retrieved single block inbound campaign successfully", "List single block inbound campaign using uuid" )

    /*
    @Usage               : List single block inbound campaign using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid block inbound campaign
    */

    findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
        return this.block_inbound_campaign.findOne( id );
    }

    @Put( ':uuid' )
    @putDecoraters( "Block inbound campaign update successfully", "Update single block inbound campaign using uuid" )

    /*
    @Usage                          : Update single block inbound campaign using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param type                     : string
    @Param type_value               : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Block inbound campaign updated successfully / Block inbound campaign already exist}
    */

    update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() createInboundBlockCampaignDto: CreateInboundBlockCampaignDto ) {
        return this.block_inbound_campaign.update( id, createInboundBlockCampaignDto );
    }

    @Patch( ':uuid' )
    @putDecoraters( "Block inbound campaign status update successfully", "Update single block inbound campaign status using uuid" )

    /*
    @Usage               : Update single block inbound campaign using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Block inbound campaign status updated successfully
    */

    patch ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
        return this.block_inbound_campaign.patch( id, patchDto );
    }

    @Delete( ':uuid' )
    @deleteDecoraters( "Block inbound campaign deleted successfully", "Delete single or multiple block inbound campaign using uuid" )

    /*
    @Usage                          : Delete single or multiple block inbound campaign using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single block inbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Block inbound campaign deleted successfully / Block inbound campaign not found}
    */

    remove ( @Param( 'uuid' ) id: string ) {
        return this.block_inbound_campaign.remove( id );
    }

    @Post( "/import" )
    @postDecoraters( "Block Inbound campaign imported successfully", "To import Block Inbound Campaign" )
    @UseInterceptors(
        FileInterceptor( 'file', {
            storage: diskStorage( {
                destination: "./upload",
                filename: ( req, file, cb ) => {
                    cb( null, `${file.originalname}` )
                }
            } )
        } )
    )

    /*
    @Usage             : To import lead management
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of lead management
    @return Object     : Success / Error
    */

    importtelecomcircle ( @Body() importData: BlockInboundCampaignImportDto, @UploadedFile( 'file', new ParseFilePipe( {
        validators: [ new FileTypeValidator( { fileType: 'csv' } ) ]
    } ) ) file, @Req() req ) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.block_inbound_campaign.importblockinboundcampaign( importData );
    }

}
