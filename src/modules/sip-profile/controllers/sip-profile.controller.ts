import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateSipProfileDto } from "../dto/create-sip-profile.dto";
import { StartRescanProfileDto } from "../dto/start-rescan-profile.dto";

import { SipProfileService } from "../services/sip-profile-service";

@Controller("sip-profile")

/*@Usage : To provide title of API in swagger */
@ApiTags("Sip Profile")

export class SipProfileController {

    constructor(private readonly sip_profile: SipProfileService) { }

    @Post()
    @jsonDecorator("Sip profile created successfully", "Create a new sip profile")

    /*
    @Usage          : To create new sip profile
    @Method         : POST
    @Param name     : string
    @Param sip_ip   : string
    @Param sip_port : sip_port will be number string
    @Param status   : string
    @return success / error object  : { Sip profile created successfully / Sip profile already exist}
    */

    create(@Body() createSipProfileDto: CreateSipProfileDto) {
        return this.sip_profile.create(createSipProfileDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved sip profile successfully", "Advanced search for particular filed")

    /*
    @Usage          : To search sip profile
    @Method         : POST
    @Param name     : string
    @Param sip_ip   : string
    @Param sip_port : sip_port will be number string
    @Param status   : string
    @return success / error object  : { Sip profile retrieved successfully / Not found }
    */

    advancedSearch(@Body() searchData) {
        return this.sip_profile.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all sip profile successfully", "List all sip profile")

    /*
    @Usage   : List all sip profile
    @Method  : GET
    @return  : Array of an object with total count of sip profile with data
    */

    findAll(@Query() queryParam) {
        return this.sip_profile.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single sip profile successfully", "List single sip profile using uuid")

    /*
    @Usage               : List single sip profile using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid sip profile
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.sip_profile.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Sip profile update successfully", "Update single Sip profile using uuid")

    /*
    @Usage               : Update single sip profile using uuid
    @Method              : PUT
    @Param name          : string
    @Param sip_ip        : string
    @Param sip_port      : sip_port will be number string
    @Param status        : string
    @Param sip_details   : object
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Sip profile updated successfully / Sip profile already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createSipProfileDto: CreateSipProfileDto) {
        return this.sip_profile.update(id, createSipProfileDto);
    }

    @Patch(':uuid')
    @putDecoraters("Sip profile status update successfully", "Update single sip profile status using uuid")

    /*
    @Usage               : Update single sip profile using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return success / error object  : { Sip profile status updated successfully / Sip profile not found }
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.sip_profile.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Sip profile deleted successfully", "Delete single sip profile using uuid")

    /*
    @Usage               : Delete single or multiple sip profile using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single sip profile pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Sip profile deleted successfully / Sip profile not found}
    */

    remove(@Param('uuid') id: string) {
        return this.sip_profile.remove(id);
    }

    @Post("/:feature")
    @jsonDecorator("Sip profile created successfully", "Create a new sip profile")

    /*
    @Usage          : To reload/rescan newly created sip profile
    @Method         : POST
    @Param name     : string[Profile name]
    */

    reloadProfile(@Body() startRescanProfileDto: StartRescanProfileDto, @Param() params) {
        let response;
        const { feature } = params;
        const { name } = startRescanProfileDto;
        switch (feature) {
            case "start":
                response = this.sip_profile.reloadProfile(name,feature);
            break;
            case "rescan":
                response = this.sip_profile.reloadProfile(name,feature);
            break;
        }
        return response;
    }
}
