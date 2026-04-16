import { BadRequestException, Body, Controller, Delete, Get, Param, FileTypeValidator, ParseUUIDPipe, ParseFilePipe, UploadedFile, Req, Patch, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateWebformDto } from "../dto/create-webform.dto";
import { WebformService } from "../services/webform.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
//import { DncImportDto } from "../dto/dnc-import.dto";

@Controller("webform")

/*@Usage : To provide title of API in swagger */
@ApiTags("Webform")
export class WebformController {

    /*
    @Usage  : To load webform service and other libraries
    @return : Object[webform] 
    */

    constructor(private readonly webform: WebformService) { }

    @Post()
    @postDecoraters("Webform created successfully", "Create a new Webform")
    /*
    @Usage                          : To create new Webform
    @Method                         : POST
    @Param name                     : string
    @Param description              : string
    @Param url                      : string
    @Param tenant_uuid              : string
    @return success / error object  : { Webform created successfully / Webform already exist}
    */

    create(@Body() createWebformDto: CreateWebformDto) {
        return this.webform.create(createWebformDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved tenants successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search tenant
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of dnc with data
    */

    advancedSearch(@Body() searchData) {
        return this.webform.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all Webform successfully", "List all Webform")

    /*
    @Usage  : List all webform
    @Method : GET
    @return : Array of an object with total count of webform with data
    */

    findAll(@Query() queryParam) {
        return this.webform.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single Webform successfully", "List single Webform using uuid")

    /*
    @Usage               : List single Webform using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid webform
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.webform.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Webform update successfully", "Update single Webform using uuid")

    /*
    @Usage                          : Update single webform using uuid
    @Method                         : PUT
       @Param name                     : string
    @Param description              : string
    @Param url                      : string
    @Param tenant_uuid              : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Webform updated successfully / Webform already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createWebformDto: CreateWebformDto) {
        return this.webform.update(id, createWebformDto);
    }


    @Delete(':uuid')
    @deleteDecoraters("Webform deleted successfully", "Delete single or multiple Webform using uuid")

    /*
    @Usage               : Delete single or multiple Webform using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single Webform pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Webform deleted successfully / Webform not found}
    */

    remove(@Param('uuid') id: string) {
        return this.webform.remove(id);
    }

    // @Post( "/import" )
    // @postDecoraters( "Dnc imported successfully", "To import Dnc" )
    // @UseInterceptors(
    //     FileInterceptor( 'file', {
    //         storage: diskStorage( {
    //             destination: "./upload",
    //             filename: ( req, file, cb ) => {
    //                 cb( null, `${file.originalname}` )
    //             }
    //         } )
    //     } )
    // )

    // /*
    // @Usage             : To import lead management
    // @Method            : POST
    // @Param user_uuid   : string
    // @Param file        : csv file of lead management
    // @return Object     : Success / Error
    // */

    // importtelecomcircle ( @Body() importData: DncImportDto, @UploadedFile( 'file', new ParseFilePipe( {
    //     validators: [ new FileTypeValidator( { fileType: 'csv' } ) ]
    // } ) ) file, @Req() req ) {
    //     const { uuid } = req.user;
    //     importData.file = file.originalname;
    //     importData.tenant_uuid = uuid;
    //     return this.dnc.importdnc( importData );
    // }
}
