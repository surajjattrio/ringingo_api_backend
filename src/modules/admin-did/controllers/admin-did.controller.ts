import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe , ParseUUIDPipe, Patch, Post, Put, Query , Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateAdminDidDto } from "../dto/create-admin-did.dto";
import { AssignAdminDidDto } from "../dto/assign-admin-did.dto";
import { AdminDidService } from '../services/admin-did.service';
import { AdminDidImportDto } from "../dto/admin-did-import.dto";
import { diskStorage } from "multer";

@Controller("admin-did")

/*@Usage : To provide title of API in swagger */
@ApiTags("Admin DID")

export class AdminDidController {

    constructor(private readonly admin_did: AdminDidService) { }

    @Post()
    @postDecoraters("Admin DID created successfully", "Create a new Admin DID")

    /*
    @Usage                          : To create new DID
    @Method                         : POST
    @Param number                   : string
    @Param status                   : number[Default 0]
    @Param codec                    : string 
    @Param timeout                  : number
    @Param assign_tenant_uuid       : string
    @return success / error object  : { Admin Did created successfully / Admin Did already exist}
    */

    create(@Body() createAdminDidDto: CreateAdminDidDto) {
        return this.admin_did.create(createAdminDidDto);
    }

    @Get()
    @getDecoraters("Retrieved all admin did successfully", "List all admin did")

    /*
    @Usage  : List all admin did
    @Method : GET
    @return : Array of an object with total count of admin did with data
    */

    findAll(@Query() queryParam) {
        return this.admin_did.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single admin did successfully", "List single admin did using uuid")

    /*
   @Usage               : List single admin did using uuid
   @Method              : GET
   @Param  uuid         : string
   @Param ParseUUIDPipe : To validate uuid
   @return object       : Full detail of particular uuid did
   */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.admin_did.findOne(id);
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
    @return success / error object  : { Admin Did updated successfully / number already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() CreateAdminDidDto: CreateAdminDidDto) {
        return this.admin_did.update(id, CreateAdminDidDto);
    }

    @Patch(':uuid')
    @putDecoraters("Admin Did status update successfully", "Update single Admin Did status using uuid")

    /*
    @Usage               : Update single admin did using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Admin Did status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.admin_did.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Admin Did deleted successfully", "Delete single or multiple Admin Did using uuid")

    /*
    @Usage               : Delete single or multiple admin did using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single admin did pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Admin Did deleted successfully / Admin Did not found}
    */

    remove(@Param('uuid') id: string) {
        return this.admin_did.remove(id);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved admin did successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search admin did
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of admin did with data
    */

    advancedSearch(@Body() searchData) {
        return this.admin_did.advancedSearch(searchData);
    }


    @Patch('assign_tenant/:uuid')
    @putDecoraters("Admin Did assigned successfully", "Assign Admin Did to single or multiple tenant using uuid")

    /*
    @Usage                     : Assign Admin did to single or multiple tenant using uuid
    @Method                    : PATCH
    @Param admin_did_uuid      : string
    @Param ParseUUIDPipe       : To validate uuid
    @return success / error object  : { Admin Did assigned successfully / Admin Did assigned failed due to tenant not found }
    */

    assignAdminDid(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() assignAdminDidDto: AssignAdminDidDto) {
        return this.admin_did.assignAdminDid(id, assignAdminDidDto);
    }
    



   @Get('tenant/:uuid')
   @getDecoraters("Retrieved assign tenant admin did successfully", "List assign tenant admin did using uuid")

    /*
   @Usage               : List assign tenant admin did using uuid
   @Method              : GET
   @Param  uuid         : string
   @Param ParseUUIDPipe : To validate uuid
   @return object       : Full detail of particular uuid did
   */

    findTenant(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.admin_did.findTenant(id);
    }
    

    /*Admin DID Import */

    @Post("/import")
    @postDecoraters("Admin DID imported successfully", "To import Admin DID")
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            })
        }))


    /*
    @Usage             : To import Admin DID
    @Method            : POST
    @Param tenant_uuid : string
    @Param file        : csv file of Admin DID
    @return Object     : Success / Error
    */

    importAdminDID(@Body() importData: AdminDidImportDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid, role } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        importData.role = role;
        return this.admin_did.importAdminDID(importData);
    }

}

