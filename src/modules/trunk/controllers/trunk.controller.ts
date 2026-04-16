import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { AssignTrunkDto } from "../dto/assign-trunk.dto";
import { CreateTrunkDto } from "../dto/create-trunk.dto";
import { TenantTrunkDto } from "../dto/tenant-trunk.dto";
import { TrunkService } from "../services/trunk.service";

@Controller("trunk")

/*@Usage : To provide title of API in swagger */
@ApiTags("Trunk")

export class TrunkController {

    /*
    @Usage  : To load trunk service and other libraries
    @return : Object[trunk] 
    */

    constructor(
        private readonly trunk: TrunkService
    ) { }

    @Post()
    @postDecoraters("Trunk created successfully", "Create a new trunk")

    /*
    @Usage                  : To create new trunk
    @Method                 : POST
    @Param name             : string
    @Param sip_profile      : string
    @Param username         : string
    @Param password         : string
    @Param proxy            : string
    @Param outbound_proxy   : string
    @Param register         : numberString [Default 0]
    @return success / error object  : { Trunk created successfully / Trunk already exist}
    */

    create(@Body() createTrunkDto: CreateTrunkDto) {
        return this.trunk.create(createTrunkDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved all trunk successfully", "Advanced search for particular filed")

    /*
    @Usage          : To search trunk
    @Method         : POST
    @Param name     : string
    @Param domain   : string
    @Param status   : string
    @return success / error object  : { Trunk retrieved successfully / Trunk not found }
    */

    advancedSearch(@Body() searchData) {
        return this.trunk.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all trunk successfully", "List all trunks")

    /*
    @Usage   : List all trunks
    @Method  : GET
    @return  : Array of an object with total count of trunks with data
    */

    findAll(@Query() queryParam) {
        return this.trunk.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single trunk successfully", "List single trunk using uuid")

    /*
    @Usage               : List single trunk using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid trunk
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.trunk.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Trunk update successfully", "Update single trunk using uuid")

    /*
    @Usage                  : Update single Trunk using uuid
    @Method                 : PUT
    @Param name             : string
    @Param sip_profile      : string
    @Param username         : string
    @Param password         : string
    @Param proxy            : string
    @Param outbound_proxy   : string
    @Param register         : numberString [Default 0]
    @Param ParseUUIDPipe    : To validate uuid
    @return success / error object  : { Trunk updated successfully / Trunk not found}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createTrunkDto: CreateTrunkDto) {
        return this.trunk.update(id, createTrunkDto);
    }

    @Patch(':uuid')
    @putDecoraters("Trunk status update successfully", "Update single trunk status using uuid")

    /*
    @Usage               : Update single trunk using uuid
    @Method              : PATCH
    @Param               : Single or multiple params will receive here
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Trunk status updated successfully / Trunk not found }
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.trunk.patch(id, patchDto);
    }

    @Patch('assign/:uuid')
    @putDecoraters("Trunk assigned successfully", "Assign trunk to single or multiple tenant using uuid")

    /*
    @Usage               : Assign trunk to single or multiple tenant using uuid
    @Method              : PATCH
    @Param tenant_uuid   : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Trunk assigned successfully / Trunk assigned failed due to tenant not found }
    */

    assignTrunk(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() assignTrunkDto: AssignTrunkDto) {
        return this.trunk.assignTrunk(id, assignTrunkDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Trunk deleted successfully", "Delete single or multiple trunk using uuid")

    /*
    @Usage       : Delete single or multiple trunk using uuid
    @Method      : DELETE
    @Param  uuid : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Trunk deleted successfully / Trunk not found}
    */

    remove(@Param('uuid') id: string) {
        return this.trunk.remove(id);
    }

    /* For Tenant */

    @Post("/tenant")
    @postDecoraters("Trunk created successfully", "Create a new trunk")

    /*
    @Usage                  : To create new trunk for tenant
    @Method                 : POST
    @Param name             : string
    @Param username         : string
    @Param password         : string
    @Param proxy            : string
    @Param outbound_proxy   : string
    @Param register         : string [Default 0]
    @return success / error object  : { Trunk created successfully / Trunk already exist}
    */

    createTrunkForTenant(@Body() tenantTrunkDto: TenantTrunkDto) {
        return this.trunk.createTrunkForTenant(tenantTrunkDto);
    }

    @Put('/tenant/:uuid')
    @putDecoraters("Trunk update successfully", "Update single trunk using uuid")

    /*
    @Usage                  : Update single Trunk using uuid
    @Method                 : PUT
    @Param name             : string
    @Param username         : string
    @Param password         : string
    @Param proxy            : string
    @Param outbound_proxy   : string
    @Param register         : string [Default 0]
    @Param ParseUUIDPipe    : To validate uuid
    @return success / error object  : { Trunk updated successfully / Trunk not found}
    */

    updateTrunkForTenant(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() tenantTrunkDto: TenantTrunkDto) {
        return this.trunk.updateTrunkForTenant(id, tenantTrunkDto);
    }
}
