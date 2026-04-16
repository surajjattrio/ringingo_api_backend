import { BadRequestException, Body, Controller, Delete, Get, Param,FileTypeValidator, ParseUUIDPipe,ParseFilePipe,UploadedFile,Req ,Patch, Post, Put, Query , UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { diskStorage } from "multer";
import { FileInterceptor } from "@nestjs/platform-express";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { TelecomCircleDto } from "../dto/telecom-circle.dto";
import { TelecomCircleImportDto } from "../dto/telecom-circle-import.dto";
// import { TelecomcircleImportMapperDto} from "../dto/telecom-circle-import-mapper.dto"
import { TelecomCircleService } from "../services/telecom-circle.service";
import { telecomCircleSchema } from "../schema/telecom-circle.schema";

@Controller( "telecomcircle" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Telecom-Circle" )

export class TelecomcircleController {

    /*
    @Usage  : To load user service and other libraries
    @return : Object[user]
    */

    constructor( private readonly telecomcircle: TelecomCircleService ) { }

    @Get()
    @getDecoraters( "Retrieved all telecom-circle successfully", "List all telecom-circle" )

    /*
    @Usage  : List all telecom-circle
    @Method : GET
    @return : Array of an object with total count of users with data
    */

    findAll ( @Query() queryParam ) {
        return this.telecomcircle.findAll( queryParam );
    }


    @Get( ':uuid' )
    @getDecoraters( "Retrieved single telecom-circle successfully", "List single telecom-circle using uuid" )

    /*
    @Usage               : List single telecom-circle using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid user
    */

    findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
        return this.telecomcircle.findOne( id );
    }





    @Post()
    @postDecoraters( "Telecom-Circle created successfully", "Create a new telecom-circle" )

    /*
    @Usage                          : To create new user
    @Method                         : POST
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param default_timeout          : string
    @Param recording                : string
    @Param status                   : integer [Default 0]
    @Param default_extension_type   : integer [Default 0]
    @return success / error object  : { User created successfully / User already exist }
    */

    create ( @Body() telecomCircleDto: TelecomCircleDto ) {
        return this.telecomcircle.create( telecomCircleDto );
    }

    @Put( ':uuid' )
    @putDecoraters( "User update successfully", "Update single user using uuid" )

    /*
    @Usage                          : Update single user using uuid
    @Method                         : PUT
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param default_timeout          : string
    @Param recording                : string
    @Param status                   : integer [Default 0]
    @Param default_extension_type   : integer [Default 0]
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { User updated successfully / User not found}
    */

    update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() telecomCircleDto: TelecomCircleDto ) {
        return this.telecomcircle.update( id, telecomCircleDto );
    }

    @Delete( ':uuid' )
    @deleteDecoraters( "Telecom-circle deleted successfully", "Delete single or multiple telecom-circle using uuid" )

    /*
    @Usage               : Delete single or multiple telecom-circle using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single telecom-circle pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Telecom-Circle deleted successfully / Telecom-Circle not found}
    */

    remove ( @Param( 'uuid' ) id: string ) {
        return this.telecomcircle.remove( id );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved telecom-circle successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search telecom-circle
    @Method            : POST
    @Param             : Single or multiple parameter
    @return Object     : Array of an object with total count of tenants with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.telecomcircle.advancedSearch( searchData );
    }

    @Post("/import")
    @postDecoraters("Telecom-Circle imported successfully", "To import telecom-circle")
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            })
        })
    )

    /*
    @Usage             : To import lead management
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of lead management
    @return Object     : Success / Error
    */

    importtelecomcircle(@Body() importData: TelecomCircleImportDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.telecomcircle.importtelecomcircle(importData);
    }




}

