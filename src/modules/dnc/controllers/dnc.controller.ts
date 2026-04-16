import { BadRequestException, Body, Controller, Delete, Get, Param, FileTypeValidator, ParseUUIDPipe, ParseFilePipe, UploadedFile, Req, Patch, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateDncDto } from "../dto/create-dnc.dto";
import { DncService } from "../services/dnc.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { DncImportDto } from "../dto/dnc-import.dto";

@Controller("dnc")

/*@Usage : To provide title of API in swagger */
@ApiTags("Dnc")
export class DncController {

    /*
    @Usage  : To load dnc service and other libraries
    @return : Object[dnc] 
    */

    constructor(private readonly dnc: DncService) { }

    @Post()
    @postDecoraters("DNC created successfully", "Create a new DNC")
    /*
    @Usage                          : To create new DNC
    @Method                         : POST
    @Param phone_number             : string
    @Param status                   : number[Default 0]
    @Param global_status            : string
    @Param campaign_uuid                 : string 
    @Param tenant_uuid              : string
    @return success / error object  : { DNC created successfully / DNC already exist}
    */

    create(@Body() createDncDto: CreateDncDto) {
        return this.dnc.create(createDncDto);
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
        return this.dnc.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all DNC successfully", "List all DNC")

    /*
    @Usage  : List all dnc
    @Method : GET
    @return : Array of an object with total count of dnc with data
    */

    findAll(@Query() queryParam) {
        return this.dnc.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single DNC successfully", "List single DNC using uuid")

    /*
    @Usage               : List single dnc using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid dnc
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.dnc.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("DNC update successfully", "Update single DNC using uuid")

    /*
    @Usage                          : Update single dnc using uuid
    @Method                         : PUT
    @Param phone_number             : string
    @Param status                   : number[Default 0]
    @Param global_status            : string
    @Param campaign_uuid                : string 
    @Param tenant_uuid              : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { DNC updated successfully / DNC already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createDncDto: CreateDncDto) {
        return this.dnc.update(id, createDncDto);
    }

    @Patch(':uuid')
    @putDecoraters("DNC status update successfully", "Update single DNC status using uuid")

    /*
    @Usage               : Update single dnc using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : DNC status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.dnc.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("DNC deleted successfully", "Delete single or multiple DNC using uuid")

    /*
    @Usage               : Delete single or multiple dnc using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single dnc pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { DNC deleted successfully / DNC not found}
    */

    remove(@Param('uuid') id: string) {
        return this.dnc.remove(id);
    }

    @Post( "/import" )
    @postDecoraters( "Dnc imported successfully", "To import Dnc" )
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

    importtelecomcircle ( @Body() importData: DncImportDto, @UploadedFile( 'file', new ParseFilePipe( {
        validators: [ new FileTypeValidator( { fileType: 'csv' } ) ]
    } ) ) file, @Req() req ) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.dnc.importdnc( importData );
    }
}
