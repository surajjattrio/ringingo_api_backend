import { Body, Controller, Delete, Get, Param, Req, ParseUUIDPipe, Patch, Post, Put, Query, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FilesInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateWhatsappmessageDto } from "../dto/create-whatsappmessage.dto";
import { WhatsappmessageService } from '../services/whatsappmessage.service';
import { Unread_whatsappmessageDto } from "../dto/unread_whatsappmessage.dto";
import { diskStorage, Multer } from 'multer';
import { randomUUID } from "crypto";
import * as path from "path"
@Controller( "whatsappmessage" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "WhatsappMessage" )

export class WhatsappmessageController {

    constructor( private readonly whatsappmessage: WhatsappmessageService ) { }

    @Post()
    @UseInterceptors(
        FileFieldsInterceptor( [
            { name: 'image_url', maxCount: 10 },
            { name: 'document_url', maxCount: 10 },
        ], {
            storage: diskStorage( {
                destination: ( req, file, cb ) => {
                    const path2 = path.resolve(process.cwd(), "upload/whatsapp_image/send");
                    //const path = file.fieldname === 'image_url'
                    //    ? '/var/www/html/whatsapp_image/send'
                    //    : '/var/www/html/whatsapp_image/send';
                    cb( null, path2 );
                },
                filename: ( req, file, cb ) => {
                    const filename = `${randomUUID()}-${file.originalname}`;
                    cb( null, filename );
                },
            } ),
        } ),
    )
    async sendwhatsappmessage (
        @Body() createWhatsappmessageDto: CreateWhatsappmessageDto,
        @UploadedFiles() files: { image_url?: Express.Multer.File[], document_url?: Express.Multer.File[] },
        @Req() req,
    ) {
        // console.log( 'Request:', req );
        const file = req.files; // Assuming `req` is the request object
        console.log( 'file:', file );
        const tenant_uuid = req.user?.tenant_uuid || createWhatsappmessageDto.tenant_uuid;
        createWhatsappmessageDto.tenant_uuid = tenant_uuid;
        const user_uuid = req.user?.uuid;
        createWhatsappmessageDto.user_uuid = user_uuid;
        console.log( user_uuid );
        const image_url = files.image_url || [];
        const document_url = files.document_url || [];

        if ( image_url.length > 0 ) {
            const filenames = image_url.map( file => file.filename );
            console.log( 'Uploaded images:', filenames );
        }

        if ( document_url.length > 0 ) {
            const documentUrls = document_url.map( file => file.path );
            console.log( 'Uploaded documents:', documentUrls );
        }

        console.log( 'Received DTO:', createWhatsappmessageDto );

        return this.whatsappmessage.sendwhatsappmessage( createWhatsappmessageDto, image_url, document_url );
    }


    // @Post()
    // // @jsonDecorator( "WhatsappMessage created successfully", "Create a new WhatsappMessage" )
    // @UseInterceptors(
    //     FilesInterceptor( 'image_url', 10 ),
    //     FilesInterceptor( 'document_url', 10,
    //         {
    //             storage: diskStorage( {
    //                 destination: '/var/www/html/whatsapp_image/send',
    //                 filename: ( req, file, cb ) => {
    //                     const filename = `${uuidv4()}-${file.originalname}`;
    //                     // const filename = `${file.originalname}`;
    //                     cb( null, filename );
    //                 }
    //             } )
    //         } ) )
    /*
    @Usage                          : To create new send WhatsappMessage
    @Method                         : POST
    @Param name                     : string
    @return success / error object  : { Whatsappmessage created successfully / Whatsappmessage already exist}
    */

    // create ( @Body() createWhatsappmessageDto: CreateWhatsappmessageDto,
    //     // @UploadedFiles() image_url: Express.Multer.File[],
    //     // @UploadedFiles() document_url: Express.Multer.File[],
    //     @Req() req, ) {
    //     console.log( 'Request:', req );
    //     const files = req.files;
    //     const image_url = files.image_url || [];
    //     const document_url = files.document_url || [];
    //     const tenant_uuid = req.user?.tenant_uuid || createWhatsappmessageDto.tenant_uuid;
    //     createWhatsappmessageDto.tenant_uuid = tenant_uuid;
    //     if ( image_url && image_url.length > 0 ) {
    //         const filenames = image_url.map( file => file.filename );
    //         console.log( 'Uploaded files:', filenames );
    //         // You can use the filenames here as needed
    //     }
    //     if ( document_url && document_url.length > 0 ) {
    //         const documentUrls = document_url.map( file => file.path );
    //         console.log( 'Uploaded documents:', documentUrls );
    //         // Handle document URLs as needed (store in database, etc.)
    //     }
    //     console.log( 'Received DTO:', createWhatsappmessageDto );

    //     return this.whatsappmessage.create( createWhatsappmessageDto, image_url, document_url );
    // }

    // @Post()
    // @jsonDecorator( "WhatsappMessage created successfully", "Create a new WhatsappMessage" )

    // create ( @Body() createWhatsappmessageDto: CreateWhatsappmessageDto ) {
    //     console.log( 'Received DTO:', createWhatsappmessageDto );
    //     return this.whatsappmessage.create( createWhatsappmessageDto );
    // }


    @Post( "all_whatsappmessage" )
    @jsonDecorator( "Retrieved all Whatsappmessage successfully", "List all Whatsappmessage" )

    /*
    @Usage  : List all Whatsappmessage data
    @Method : GET
    @return : Array of an object with total count of Whatsappmessage with data
    */

    all_whatsappmessage ( @Body() queryParam ) {
        console.log( queryParam );
        console.log( "ssss" );
        return this.whatsappmessage.all_whatsappmessage( queryParam );
    }

    @Post( "read_unreadsection" )
    @jsonDecorator( "WhatsappMessage created successfully", "Create a new WhatsappMessage" )

    /*
    @Usage                          : To create new send WhatsappMessage
    @Method                         : POST
    @Param name                     : string
    @return success / error object  : { Whatsappmessage created successfully / Whatsappmessage already exist}
    */

    unreadsection ( @Body() queryParam ) {
        return this.whatsappmessage.unreadsection( queryParam );
    }

    @Get( "/select_queue" )
    @getDecoraters( "Retrieved all select queue successfully", "List all select queue" )

    /*
    @Usage  : List all select_queue
    @Method : GET
    @return : Array of an object with total count of select_queue with data
    */

    select_queue ( @Query() queryParam ) {
        return this.whatsappmessage.select_queue( queryParam );
    }

    @Post( "/messaging_queue_channel" )
    @jsonDecorator( "Retrieved all messaging_queue_channel successfully", "List all messaging_queue_channel" )

    /*
    @Usage  : List all select_queue
    @Method : GET
    @return : Array of an object with total count of messaging_queue_channel with data
    */

    messaging_queue_channel ( @Body() queryParam ) {
        console.log( "queryParammmmm" );
        console.log( queryParam );
        return this.whatsappmessage.messaging_queue_channel( queryParam );
    }

}
