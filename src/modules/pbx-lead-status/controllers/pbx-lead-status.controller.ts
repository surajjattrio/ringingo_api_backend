import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreatePbxLeadStatusDto } from "../dto/create-pbx-lead-status.dto";
import { PbxLeadStatusService } from "../services/pbx-lead-status.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";

@Controller("pbx-lead-status")

/*@Usage : To provide title of API in swagger */
@ApiTags("PBX Lead Status")

export class PbxLeadStatusController {

    /*
    @Usage  : To load pbx lead status schema and other libraries
    @return : Object[pbx_lead_status] 
    */

    constructor(private readonly pbx_lead_status: PbxLeadStatusService) { }

    @Post()
    @postDecoraters("Lead status created successfully", "Create a new lead status")

    /*
    @Usage                          : To create new lead status
    @Method                         : POST
    @Param name                     : string
    @Param code                     : string
    @Param status                   : string
    @return success / error object  : { Lead status created successfully / Lead status already exist}
    */

    create(@Body() createDispositionDto: CreatePbxLeadStatusDto) {
        return this.pbx_lead_status.create(createDispositionDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved lead status successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search lead status
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of lead status with data
    */

    advancedSearch(@Body() searchData) {
        return this.pbx_lead_status.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all lead status successfully", "List all lead status")

    /*
    @Usage  : List all lead status
    @Method : GET
    @return : Array of an object with total count of lead status with data
    */

    findAll(@Query() queryParam) {
        return this.pbx_lead_status.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single lead status successfully", "List single lead status using uuid")

    /*
    @Usage               : List single lead status using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid lead status
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.pbx_lead_status.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage                          : Update single lead status using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param code                     : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Lead status updated successfully / Lead status already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createPbxLeadStatusDto: CreatePbxLeadStatusDto) {
        return this.pbx_lead_status.update(id, createPbxLeadStatusDto);
    }

    @Patch(':uuid')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage               : Update single lead status using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.pbx_lead_status.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Lead status deleted successfully", "Delete single or multiple lead status using uuid")

    /*
    @Usage                          : Delete single or multiple lead status using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single lead status pass one uuid , for multiple pass comma separated uuids without space
    @return success / error object  : { Lead status deleted successfully / Lead status not found}
    */

    remove(@Param('uuid') id: string) {
        return this.pbx_lead_status.remove(id);
    }
}
