import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe, ParseUUIDPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateStateDto } from "../dto/create-state.dto";
import { StateService } from "../services/state.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { StateImportDto } from "../dto/state-import.dto";

@Controller("state")

/*@Usage : To provide title of API in swagger */
@ApiTags("State")
export class StateController {

    constructor(private readonly states: StateService) { }

    @Post()
    @postDecoraters("State created successfully", "Create a new state")

    /*
    @Usage               : To create new state
    @Method             : POST
    @Param statename     : string
    @Param statecode     : string
    @Param togglestatus  : string[Default 0]
    @return success / error object  : { State created successfully / State already exist}
    */

    create(@Body() createStateDto: CreateStateDto) {
        return this.states.create(createStateDto);
    }

    @Get()
    @getDecoraters("Retrieved all states successfully", "List all states")

    /*
    @Usage  : List all states
    @Method : GET
    @return : Array of an object with total count of states with data
    */

    findAll(@Query() queryParam) {
        return this.states.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single state successfully", "List single state using uuid")

    /*
    @Usage         : List single state using uuid
    @Method        : GET
    @Param  uuid   : string
    @return object : Full detail of particular uuid state
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.states.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("State update successfully", "Update single state using uuid")

    /*
    @Usage              : Update single state using uuid
    @Method             : PUT
     @Param statename    : string
    @Param statecode     : string
    @Param togglestatus  : string[Default 0]
    @return success / error object  : { State updated successfully / State already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createStateDto: CreateStateDto) {
        return this.states.update(id, createStateDto);
    }

    @Patch(':uuid')
    @putDecoraters("State status update successfully", "Update single state status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : State status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.states.patch(id, patchDto);
    }

    @Patch('update-by-status/:uuid')
    @putDecoraters("State status update successfully", "Update multiple state status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : State status updated successfully
    */

    updateByStatus(@Param('uuid') id: string, @Body() patchDto: PatchDto) {
        return this.states.updateByStatus(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("State deleted successfully", "Delete single state using uuid")

    /*
    @Usage       : Delete single state using uuid
    @Method      : DELETE
    @Param  uuid : string
    @return success / error object  : { State deleted successfully / State Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.states.remove(id);
    }

    @Post("advanced-search")
    @postDecoraters("State created successfully", "Create a new state")

    /*
   @Usage              : To search states
   @Method             : POST
    @Param statename   : string
    @Param statecode   : string
    @Param togglestatus : string[Default 0]
   @return Object      : Array of an object with total count of states with data
   */

    advancedSearch(@Body() searchData) {
        return this.states.advancedSearch(searchData);
    }

    @Post("/import")
    @postDecoraters("State imported successfully", "To import State")
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
    @Usage             : To import State
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of State
    @return Object     : Success / Error
    */

    importStates(@Body() importData: StateImportDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.states.importState(importData);
    }
}
