import { Body, Controller, Get, Param, Post, Query, Req, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OmnichannelmessageService } from '../services/omnichannelmessage.service';
// import { SendMessageDto, GetMessagesDto, MarkAsReadDto } from '../dto/omnichannelmessage.dto';
import { postDecoraters, getDecoraters, jsonDecorator } from "src/swagger/swagger_decoraters";
// import { CreateWhatsappmessageDto } from "src/modules/whatsapp-message/dto/create-whatsappmessage.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import * as path from "path"
import { OmniChannelmessageDto } from "../dto/omnichannelmessage.dto";


@Controller("omnichannelmessage")
@ApiTags("OmnichannelMessage")
export class OmnichannelmessageController {
    constructor(private readonly omnichannelmessage: OmnichannelmessageService) { }

    @Post(':channel/send')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'image_url', maxCount: 10 },
            { name: 'document_url', maxCount: 10 },
        ], {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const path2 = path.resolve(process.cwd(), "upload/whatsapp_image/send");
                    //const path = file.fieldname === 'image_url'
                    //    ? '/var/www/html/whatsapp_image/send'
                    //    : '/var/www/html/whatsapp_image/send';
                    cb(null, path2);
                },
                filename: (req, file, cb) => {
                    const filename = `${randomUUID()}-${file.originalname}`;
                    cb(null, filename);
                },
            }),
        }),
    )

    @postDecoraters("Message sent successfully", "Send message to customer")
    async sendwhatsappmessage(@Body() omniChannelmessageDto: OmniChannelmessageDto,
        @UploadedFiles() files: { image_url?: Express.Multer.File[], document_url?: Express.Multer.File[] },
        @Req() req, @Param("channel") channel_type) {
        // console.log('📤 Send message request:', body);
        // console.log( 'Request:', req );        
        const file = req.files; // Assuming `req` is the request object
        // console.log( 'file:', file );
        const tenant_uuid = req.user?.tenant_uuid || omniChannelmessageDto.tenant_uuid;
        omniChannelmessageDto.tenant_uuid = tenant_uuid;
        const user_uuid = req.user?.uuid;
        omniChannelmessageDto.user_uuid = user_uuid;
        // console.log( user_uuid );
        const image_url = files?.image_url || [];
        const document_url = files?.document_url || [];

        if (image_url?.length > 0) {
            const filenames = image_url.map(file => file.filename);
            // console.log( 'Uploaded images:', filenames );
        }

        if (document_url?.length > 0) {
            const documentUrls = document_url.map(file => file.path);
            // console.log( 'Uploaded documents:', documentUrls );
        }

        console.log('Received DTO:', omniChannelmessageDto, channel_type);
        return this.omnichannelmessage.sendMessage(channel_type, omniChannelmessageDto, image_url, document_url);
    }

    @Post("all_whatsappmessage")
    @jsonDecorator("Retrieved all Whatsappmessage successfully", "List all Whatsappmessage")

    /*
    @Usage  : List all Whatsappmessage data
    @Method : GET
    @return : Array of an object with total count of Whatsappmessage with data
    */

    all_whatsappmessage(@Body() queryParam) {
        console.log(queryParam);
        console.log("ssss");
        return this.omnichannelmessage.all_whatsappmessage(queryParam);
    }
}