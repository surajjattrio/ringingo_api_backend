import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe , ParseUUIDPipe, Patch, Post, Put, Query , Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateDidDto } from "../dto/create-did.dto";
import { DidImportDto } from "../dto/did-import.dto";
import { ForwordingDidDto } from "../dto/forwarding-did.dto";
import { DidService } from '../services/did.service';
import { diskStorage } from "multer";

@Controller("did")

/*@Usage : To provide title of API in swagger */
@ApiTags("DID")

export class DidController {

    constructor(private readonly did: DidService) { }

    @Post()
    @postDecoraters("DID created successfully", "Create a new DID")

    /*
    @Usage                          : To create new DID
    @Method                         : POST
    @Param number                   : string
    @Param status                   : number[Default 0]
    @Param user_uuid                : string
    @Param codec                    : string 
    @Param timeout                  : number
    @Param tenant_uuid              : string
    @return success / error object  : { Did created successfully / Did already exist}
    */

    create(@Body() createDidDto: CreateDidDto) {
        return this.did.create(createDidDto);
    }

    @Get()
    @getDecoraters("Retrieved all did successfully", "List all did")

    /*
    @Usage  : List all did
    @Method : GET
    @return : Array of an object with total count of did with data
    */

    findAll(@Query() queryParam) {
        return this.did.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single did successfully", "List single did using uuid")

    /*
   @Usage               : List single did using uuid
   @Method              : GET
   @Param  uuid         : string
   @Param ParseUUIDPipe : To validate uuid
   @return object       : Full detail of particular uuid did
   */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.did.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("did update successfully", "Update single did using uuid")

    /*
    @Usage               : Update single did using uuid
    @Method              : PUT
    @Param number        : string
    @Param user          : string
    @Param timeout       : string
    @Param status        : integer [Default 0]
    @Param codec         : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Did updated successfully / number already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() CreateDidDto: CreateDidDto) {
        return this.did.update(id, CreateDidDto);
    }

    @Patch(':uuid')
    @putDecoraters("Did status update successfully", "Update single did status using uuid")

    /*
    @Usage               : Update single did using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Did status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.did.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Did deleted successfully", "Delete single or multiple did using uuid")

    /*
    @Usage               : Delete single or multiple did using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single did pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Did deleted successfully / Did not found}
    */

    remove(@Param('uuid') id: string) {
        return this.did.remove(id);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved did successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search did
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of did with data
    */

    advancedSearch(@Body() searchData) {
        return this.did.advancedSearch(searchData);
    }

    @Patch('/forward/:uuid')
    @putDecoraters("DID forward successfully", "Forward DID")


    /*
    @Usage                          : Forwarding DID
    @Method                         : POST
    @Param did_forwarding_type      : string
    @Param did_forwarding_value     : string
    @return success / error object  : { Did forward successfully / Did already forward exist}
    */

    forwarding(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() ForwordingDidDto: ForwordingDidDto) {
        return this.did.forwarding(id, ForwordingDidDto);
    }

     /* DID Import section -- Manish 25-05-23 */

    @Post("/import")
    @postDecoraters("DID imported successfully", "To import DID")
    @UseInterceptors(
        FileInterceptor('file',{
            storage : diskStorage({
                destination : "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            })
        }))


    /*
    @Usage             : To import DID
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of DID
    @return Object     : Success / Error
    */

    importDID(@Body() importData : DidImportDto , @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    } )) file , @Req() req) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.did.importDID(importData);
    }

}
