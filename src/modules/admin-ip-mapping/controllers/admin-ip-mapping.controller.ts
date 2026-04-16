import { Body, Delete , Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters , deleteDecoraters } from "src/swagger/swagger_decoraters";
import { CreateAdminIpMappingDto } from "../dto/create-admin-ip-mapping.dto";
import { AdminIpMappingService } from "../services/admin-ip-mapping.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";

@Controller("admin-ip-mapping")

/*@Usage : To provide title of API in swagger */
@ApiTags("Admin IP Mapping")

export class AdminIpMappingController {

     /*
    @Usage  : To load Admin IP mapping service and other libraries
    @return : Object[admin_ip_mapping] 
    */

   constructor(private readonly admin_ip_mapping: AdminIpMappingService) { }

   @Post()
   @postDecoraters("Admin IP mapping created successfully", "Create a new Admin IP mapping")

    /*
    @Usage                          : To create new Admin IP mapping
    @Method                         : POST
    @Param ip                       : string
    @Param prefix                   : string
    @return success / error object  : { Admin IP mapping created successfully / Admin IP mapping already exist}
    */

   create(@Body() createAdminIpMappingDto: CreateAdminIpMappingDto) {
    return this.admin_ip_mapping.create(createAdminIpMappingDto);
}

   @Post("/advanced-search")
   @postDecoraters("Retrieved Admin IP mapping successfully", "Advanced search for single or multiple filed")

 /*
    @Usage             : To search Admin IP mapping
    @Method            : POST
    @Param domain      : Single or multiple params
    @return Object     : Array of an object with total count of Admin IP mapping with data
    */

   advancedSearch(@Body() searchData) {
    return this.admin_ip_mapping.advancedSearch(searchData);
}

   @Get()
   @getDecoraters("Retrieved all Admin IP mapping successfully", "List all Admin IP mapping")

   /*
    @Usage  : List all Admin IP mapping
    @Method : GET
    @return : Array of an object with total count of Admin IP mapping with data
    */


   findAll(@Query() queryParam) {
    return this.admin_ip_mapping.findAll(queryParam);
}


   @Get(':uuid')
   @getDecoraters("Retrieved single Admin IP mapping successfully", "List single Admin IP mapping using uuid")


   /*
    @Usage               : List single Admin IP mapping using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid Admin IP mapping
    */

   findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.admin_ip_mapping.findOne(id);
}

    @Put(':uuid')
    @putDecoraters("Admin IP mapping update successfully", "Update single Admin IP mapping using uuid")


    /*
    @Usage                          : Update single Admin IP mapping using uuid
    @Method                         : PUT
    @Param ip                       : string
    @Param prefix                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Admin IP mapping updated successfully / Admin IP mapping already exist}
    */


   update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createAdminIpMappingDto: CreateAdminIpMappingDto) {
    return this.admin_ip_mapping.update(id, createAdminIpMappingDto);
}

 
    @Patch(':uuid')
    @putDecoraters("Admin IP mapping status update successfully", "Update single Admin IP mapping status using uuid")


    /*
    @Usage               : Update single Admin IP mapping using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Admin IP mapping status updated successfully
    */

   patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
    return this.admin_ip_mapping.patch(id, patchDto);
}


    @Delete(':uuid')
    @deleteDecoraters("Admin IP mapping deleted successfully", "Delete single or multiple Admin IP mapping using uuid")

     /*
  @Usage               : Delete single or multiple Admin IP mapping using uuid
  @Method              : DELETE
  @Param  uuid         : To delete single Admin IP mapping pass one uuid , for multiple pass comma separated uuids without space
  @Param ParseUUIDPipe : To validate uuid
  @return success / error object  : { Admin IP mapping deleted successfully / Admin IP mapping not found}
  */


    remove(@Param('uuid') id: string) {
    return this.admin_ip_mapping.remove(id);
  }
}