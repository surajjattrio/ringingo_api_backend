import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe, ParseUUIDPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { CallerIdGroupService } from "../services/caller-id-group.service";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateCallerIdGroupDto } from "../dto/create-caller-id-group.dto";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { CallerIdGroupImportDto } from "../dto/caller-id-group-import.dto";
import { AddCallerIdDto } from "../dto/add-caller-id.dto";

@Controller("caller-id-group")

/*@Usage : To provide title of API in swagger */
@ApiTags("Caller ID Group")

export class CallerIdGroupController {

    constructor(private caller_id_group: CallerIdGroupService) { }

    @Post()
    @postDecoraters("Caller Id group created successfully", "Create a new caller Id group")

    /*
    @Usage                          : To create new caller Id group
    @Method                         : POST
    @Param caller_id                : string
    @Param user_uuid                : string
    @Param status                   : string
    @return success / error object  : { Caller Id created successfully / Caller Id already exist}
    */

    create(@Body() createCallerIdGroupDto: CreateCallerIdGroupDto) {
        return this.caller_id_group.create(createCallerIdGroupDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved caller id groups successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search caller id groups
    @Method            : POST
    @Param             : Single or multiple paramters
    @return Object     : Array of an object with total count of caller id groups with data
    */

    advancedSearch(@Body() searchData) {
        return this.caller_id_group.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all caller id groups successfully", "List all caller id groups")

    /*
    @Usage  : List all caller id groups
    @Method : GET
    @return : Array of an object with total count of caller id groups with data
    */

    findAll(@Query() queryParam) {
        return this.caller_id_group.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single caller id group successfully", "List single caller id group using uuid")

    /*
    @Usage               : List single caller id group using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid caller id group
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string,@Query() queryParam) {
        return this.caller_id_group.findOne(id,queryParam);
    }

    @Put(':uuid')
    @putDecoraters("Caller id group update successfully", "Update single caller id group using uuid")

    /*
    @Usage                          : Update single caller id group using uuid
    @Method                         : PUT
    @Param caller_id                : string
    @Param user_uuid                : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Caller Id group updated successfully / Caller Id group already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createCallerIdGroupDto: CreateCallerIdGroupDto) {
        return this.caller_id_group.update(id, createCallerIdGroupDto);
    }

    @Patch(':uuid')
    @putDecoraters("Caller Id group status update successfully", "Update single caller Id group status using uuid")

    /*
    @Usage               : Update single caller id group using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Caller Id group status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.caller_id_group.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Caller Id group deleted successfully", "Delete single or multiple caller id group using uuid")

    /*
    @Usage                          : Delete single or multiple caller id group using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single caller id group pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Caller Id group deleted successfully / Caller Id group not found}
    */

    remove(@Param('uuid') id: string) {
        return this.caller_id_group.remove(id);
    }

    @Post("/import")
    @postDecoraters("Caller Id group imported successfully", "To import caller id group")
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
    @Usage             : To import caller id group
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of caller id group
    @return Object     : Success / Error
    */

    importCallerIdGroup(@Body() importData: CallerIdGroupImportDto, @UploadedFile('file', new ParseFilePipe({
	//fileIsRequired: true,    
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = uuid;
        return this.caller_id_group.importCallerIdGroup(importData);
    }

    @Post("/add")
    @postDecoraters("Retrieved caller id groups successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To add caller id
    @Method            : POST
    @Param             : caller id
    @return Object     : Success / Error
    */

    addCallerId(@Body() caller_id : AddCallerIdDto) {
        return this.caller_id_group.addCallerId(caller_id);
    }

    @Delete(':uuid/:id')
    @deleteDecoraters("Caller Id deleted successfully", "Delete single or multiple caller id  using uuid")

    /*
    @Usage                          : Delete single or multiple caller id using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single caller id pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Caller Id deleted successfully / Caller Id not found}
    */

    removeCallerId(@Param() callerIdData ) {
        const { uuid , id } = callerIdData;
        return this.caller_id_group.removeCallerId(uuid,id);
    } 

}   
