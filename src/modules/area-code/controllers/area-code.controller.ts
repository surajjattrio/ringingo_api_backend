import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe, ParseUUIDPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateAreaCodeDto } from "../dto/create-area-code.dto";
import { AreaCodeService } from "../services/area-code.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { AreaCodeImportDto } from "../dto/area-code-import.dto";

@Controller("area-code")

/*@Usage : To provide title of API in swagger */
@ApiTags("Area Code")
export class AreaCodeController {

    constructor(private readonly areaCodes: AreaCodeService) { }

    @Post()
    @postDecoraters("Area Code created successfully", "Create a new area code")

    /*
    @Usage              : To create new area code
    @Method             : POST
    @Param area code    : string
    @Param comment      :string
    @Param state_id     : string
    @Param type         : string[Default 0]
    @return success / error object  : { Area Code created successfully / Area Code already exist}
    */

    create(@Body() createAreaCodeDto: CreateAreaCodeDto) {
        return this.areaCodes.create(createAreaCodeDto);
    }

    @Get()
    @getDecoraters("Retrieved all area codes successfully", "List all area codes")

    /*
    @Usage  : List all area codes
    @Method : GET
    @return : Array of an object with total count of area codes with data
    */

    findAll(@Query() queryParam) {
        return this.areaCodes.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single area code successfully", "List single area code using uuid")

    /*
    @Usage         : List single area code using uuid
    @Method        : GET
    @Param  uuid   : string
    @return object : Full detail of particular uuid area code
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.areaCodes.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Area Code update successfully", "Update single area code using uuid")

    /*
    @Usage              : Update single area code using uuid
    @Method             : PUT
    @Param area code    : string
    @Param comment      : string
    @Param state_id     : string
    @Param type         : string[Default 0]
    @return success / error object  : { Area Code updated successfully / Area Code already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createAreaCodeDto: CreateAreaCodeDto) {
        return this.areaCodes.update(id, createAreaCodeDto);
    }

    @Patch(':uuid')
    @putDecoraters("Area Code status update successfully", "Update single area code status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Area Code status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.areaCodes.patch(id, patchDto);
    }

    @Patch('update-by-status/:uuid')
    @putDecoraters("Area Code status update successfully", "Update multiple area code status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Area Code status updated successfully
    */

    updateByStatus(@Param('uuid') id: string, @Body() patchDto: PatchDto) {
        return this.areaCodes.updateByStatus(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Area Code deleted successfully", "Delete single area code using uuid")

    /*
    @Usage       : Delete single area code using uuid
    @Method      : DELETE
    @Param  uuid : string
    @return success / error object  : { Area Code deleted successfully / Area Code Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.areaCodes.remove(id);
    }

    @Post("advanced-search")
    @postDecoraters("Area Code created successfully", "Create a new area code")

    /*
   @Usage              : To search areaCodes
   @Method             : POST
   @Param area code    : string
    @Param comment     : string
    @Param state_id    : string
    @Param type        : string[Default 0]
   @return Object      : Array of an object with total count of area codes with data
   */

    advancedSearch(@Body() searchData) {
        return this.areaCodes.advancedSearch(searchData);
    }

    @Post("/import")
    @postDecoraters("Area Code imported successfully", "To import Area Code")
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
    @Usage             : To import Area Code
    @Method            : POST
    @Param state_id    : string
    @Param file        : csv file of Area Code
    @return Object     : Success / Error
    */

    importAreaCodes(@Body() importData, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.areaCodes.importAreaCode(importData);
    }
}
