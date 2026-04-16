import { Body, Controller, Delete, FileTypeValidator, MaxFileSizeValidator, Get, Param, ParseFilePipe, ParseUUIDPipe, Patch, Post, Put, Req, Res, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, fileDecorator, getDecoraters, postDecoraters, putDecoraters, putFileDecorator } from "src/swagger/swagger_decoraters";
import { CreateGreetingDto } from "../dto/create-greeting.dto";
import { GreetingService } from "../services/greeting.service";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import * as path from "path";

import { Public } from "src/global_constant";

@Controller("greeting")

/*@Usage : To provide title of API in swagger */
@ApiTags("Greeting")

export class GreetingController {

    /*
    @Usage  : To load greeting service and other libraries
    @return : Object[greeting] 
    */

    constructor(private readonly greeting: GreetingService) { }

    @Post()
    @fileDecorator("Greeting created successfully", "Create a new greeting")
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: "./upload",
            filename: (req, file, cb) => {
                if (file.mimetype == "audio/wave" || file.mimetype == "audio/wav") {
                    cb(null, `${randomUUID()}.wav`)
                } else {
                    cb(null, `${randomUUID()}`)
                }
            }
        })
    }
    ))

    /*
    @Usage                          : To create new greeting
    @Method                         : POST
    @Param name                     : string
    @Param user                     : string
    @Param file                     : string 
    @return success / error object  : { Greeting created successfully / Greeting already exist}
    */

    create(@Body() createGreetingDto: CreateGreetingDto, @UploadedFile('file',
        new ParseFilePipe({
            //fileIsRequired: true,
            validators: [new FileTypeValidator({ fileType: '.(mpeg|wav|mp3)' }),
            new MaxFileSizeValidator({ maxSize: 31457280 }), // 30 MB
            ],
        })
    ) file, @Req() req) {

        const { uuid } = req.user;
        createGreetingDto.file = file.filename;
        createGreetingDto.tenant_uuid = uuid;
        createGreetingDto.uuid = file.filename;
        if (file.filename.includes(".wav")) {
            createGreetingDto.uuid = file.filename.split(".wav")[0];
        } else {
            createGreetingDto.file = `${file.filename}.wav`;
        }
        createGreetingDto.originalName = file.originalname;
        return this.greeting.create(createGreetingDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved greeting successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search greeting
    @Method            : POST
    @Param             : Single or multiple paramaters
    @return Object     : Array of an object with total count of greeting with data
    */

    advancedSearch(@Body() searchData) {
        return this.greeting.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all greetings successfully", "List all greetings")

    /*
    @Usage   : List all greetings
    @Method  : GET
    @return  : Array of an object with total count of greetings with data
    */

    findAll(@Query() queryParam) {
        return this.greeting.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single greeting successfully", "List single greeting using uuid")

    /*
    @Usage         : List single greeting using uuid
    @Method        : GET
    @Param  uuid   : string
    @return object : Full detail of particular uuid greeting
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.greeting.findOne(id);
    }

    @Put(':uuid')
    @putFileDecorator("Greeting update successfully", "Update single Greeting using uuid")
    @UseInterceptors(FileInterceptor('file'))


    /*
    @Usage                          : Update single tenant using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param user                     : string
    @Param file                     : string 
    @return success / error object  : { Greeting updated successfully / Greeting already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createGreetingDto: CreateGreetingDto, @UploadedFile('file', new ParseFilePipe({
        fileIsRequired: false, //make file optional
        validators: [new FileTypeValidator({ fileType: 'wav' }), new MaxFileSizeValidator({ maxSize: 1048576 })],
    }),) file, @Req() req) {

        const { uuid } = req.user;

        
        if (file && file?.filename) {
            console.log("Fillleeee",file)
            createGreetingDto.file = file.filename;
        } 
        // createGreetingDto.file = file.filename;
        createGreetingDto.tenant_uuid = uuid;
        return this.greeting.update(id, createGreetingDto);
    }

    @Patch(':uuid')
    @putDecoraters("Greeting status update successfully", "Update single greeting status using uuid")

    /*
    @Usage               : Update single greeting using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @return string       : Greeting status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.greeting.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Greeting deleted successfully", "Delete single Greeting using uuid")

    /*
    @Usage       : Delete single ggreeting using uuid
    @Method      : DELETE
    @Param  uuid : To delete single greeting pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Greeting deleted successfully / Greeting Not found }
    */

    remove(@Param('uuid') id: string) {
        return this.greeting.remove(id);
    }

    @Public()
    @Get("/download/:file")
    @postDecoraters("Retrieved greeting successfully", "Advanced search for single or multiple filed")

    /*
    @Usage           : To download .wav file
    @Method          : POST
    @Param  filename : Name of file which need to be download
    @return success / error object  : { Fill we be sent in body / Unable to find file }
    */

    downloadWav(@Param() filename, @Res() res) {
        res.download(path.join(__dirname, `../../../../upload/${filename.file}`))
    }

    /*
    @Usage           : To generate wav file of dynamic response CRM
    @Method          : GET
    @Param           : The Docket number
    @return wav path / error object  : { Wav file created successfully / Unable to find crm details }
    */

    @Public()
    @Get("/generateTTS/:company")
    @postDecoraters("Retrieved greeting successfully", "Advanced search for single or multiple filed")

    generateTTS(@Param('company') company: string, @Query('gcc_number') gcc_number: string) {
        return this.greeting.generateTts(gcc_number, company);
    }
}


