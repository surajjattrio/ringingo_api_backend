import { Body, Delete , Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters , deleteDecoraters } from "src/swagger/swagger_decoraters";
import { CreateIpMappingDto } from "../dto/create-ip-mapping.dto";
import { IpMappingService } from "../services/ip-mapping.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";

@Controller("ip-mapping")

/*@Usage : To provide title of API in swagger */
@ApiTags("IP Mapping")

export class IpMappingController {

    /*
    @Usage  : To load IP mapping service and other libraries
    @return : Object[ip_mapping] 
    */

    constructor(private readonly ip_mapping: IpMappingService) { }

    @Post()
    @postDecoraters("IP mapping created successfully", "Create a new IP mapping")

    /*
    @Usage                          : To create new IP mapping
    @Method                         : POST
    @Param ip                       : string
    @Param prefix                   : string
    @return success / error object  : { IP mapping created successfully / IP mapping already exist}
    */

    create(@Body() createIpMappingDto: CreateIpMappingDto) {
        return this.ip_mapping.create(createIpMappingDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved IP mapping successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search IP mapping
    @Method            : POST
    @Param domain      : Single or multiple params
    @return Object     : Array of an object with total count of IP mapping with data
    */

    advancedSearch(@Body() searchData) {
        return this.ip_mapping.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all IP mapping successfully", "List all IP mapping")

    /*
    @Usage  : List all IP mapping
    @Method : GET
    @return : Array of an object with total count of IP mapping with data
    */

    findAll(@Query() queryParam) {
        return this.ip_mapping.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single IP mapping successfully", "List single IP mapping using uuid")

    /*
    @Usage               : List single IP mapping using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid IP mapping
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.ip_mapping.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("IP mapping update successfully", "Update single IP mapping using uuid")

    /*
    @Usage                          : Update single IP mapping using uuid
    @Method                         : PUT
    @Param ip                       : string
    @Param prefix                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { IP mapping updated successfully / IP mapping already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createIpMappingDto: CreateIpMappingDto) {
        return this.ip_mapping.update(id, createIpMappingDto);
    }

    @Patch(':uuid')
    @putDecoraters("IP mapping status update successfully", "Update single IP mapping status using uuid")

    /*
    @Usage               : Update single IP mapping using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : IP mapping status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.ip_mapping.patch(id, patchDto);
    }
    
    @Delete(':uuid')
    @deleteDecoraters("IP mapping deleted successfully", "Delete single or multiple IP mapping using uuid")

  /*
  @Usage               : Delete single or multiple IP mapping using uuid
  @Method              : DELETE
  @Param  uuid         : To delete single IP mapping pass one uuid , for multiple pass comma separated uuids without space
  @Param ParseUUIDPipe : To validate uuid
  @return success / error object  : { IP mapping deleted successfully / IP mapping not found}
  */

  remove(@Param('uuid') id: string) {
    return this.ip_mapping.remove(id);
  }
}
