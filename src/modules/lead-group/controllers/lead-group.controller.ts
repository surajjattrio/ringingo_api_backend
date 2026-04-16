import { Logger , Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query , Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateLeadGroupDto } from "../dto/create-lead-group.dto";
import { LeadGroupService } from "../services/lead-group.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { Public } from "src/global_constant";
import * as fs from 'fs';

@Controller("lead-group")

/*@Usage : To provide title of API in swagger */
@ApiTags("Lead Group")

export class LeadGroupController {

    /*
    @Usage  : To load lead group service and other libraries
    @return : Object[lead_group] 
    */

    constructor(private readonly lead_group: LeadGroupService) { }

    @Post()
    @postDecoraters("Lead group created successfully", "Create a new lead group")

    /*
    @Usage                      : To create new lead group
    @Method                     : POST
    @Param user_group_uuid      : string
    @Param name                 : string
    @Param description          : string
    @Param status               : string
    @Param campaign_uuid        : string
    @return success / error object  : { Lead group created successfully / Lead group already exist}
    */

    create(@Body() createLeadGroupDto: CreateLeadGroupDto) {
        return this.lead_group.create(createLeadGroupDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved lead groups successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search lead groups
    @Method            : POST
    @Param tenant_name : Single or multiple paramters
    @return Object     : Array of an object with total count of lead group with data
    */

    advancedSearch(@Body() searchData) {
        return this.lead_group.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all lead groups successfully", "List all lead groups")

    /*
    @Usage  : List all lead groups
    @Method : GET
    @return : Array of an object with total count of lead group with data
    */

    findAll(@Query() queryParam) {
        return this.lead_group.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single lead group successfully", "List single lead group using uuid")

    /*
    @Usage               : List single lead group using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid lead group
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.lead_group.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Lead group update successfully", "Update single lead group using uuid")

    /*
    @Usage                          : Update single lead group using uuid
    @Method                         : PUT
    @Param user_group_uuid          : string
    @Param name                     : string
    @Param description              : string
    @Param status                   : string
    @Param campaign_uuid            : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Lead group updated successfully / Lead group already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createLeadGroupDto: CreateLeadGroupDto) {
        return this.lead_group.update(id, createLeadGroupDto);
    }

    @Patch(':uuid')
    @putDecoraters("Lead group status update successfully", "Update single Lead group status using uuid")

    /*
    @Usage               : Update single Lead group using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead group status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.lead_group.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Lead group deleted successfully", "Delete single or multiple lead group using uuid")

    /*
    @Usage               : Delete single or multiple lead group using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single lead group pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Lead group deleted successfully / Lead group not found}
    */

    remove(@Param('uuid') id: string) {
        return this.lead_group.remove(id);
    }

    @Delete('all-leads/:lead_group_uuid')
    @deleteDecoraters("Lead group deleted successfully", "Delete single or multiple lead group using uuid")

    /*
    @Usage               : Delete multiple lead's using lead group uuid
    @Method              : DELETE
    @Param  lead_group_uuid         : To delete all lead's based on lead group uuid
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Leads deleted successfully / Unable to delete leads }
    */

    removeAllLeadsBasedOnLeadGroup(@Param('lead_group_uuid') id: string) {
        return this.lead_group.removeAllLeads(id);
    }

    @Get('export-user-info/:lead_group_uuid')
    @getDecoraters("Leads exported successfully", "To export leads using lead group uuid")

    /*
    @Usage                          : To export leads using lead group uuid
    @Method                         : GET
    @Param  lead_group_uuid         : To delete all lead's based on lead group uuid
    @return success / error object  : { Leads exported successfully / Unable to delete leads }
    */

    exportLeadsWithDetails(@Param('lead_group_uuid') id: string, @Query() queryParams) {
        return this.lead_group.exportLeadsWithDetails(id, queryParams);
    }

    @Public()
    @Get("/download/leads")
    @getDecoraters("To download leads data", "To download leads")

    /*
    @Usage             : To download leads data in .csv file
    @Method            : GET
    @Param  res        : Response object  
    @Param  queryParam : Name of lead group
    @return success / error object  : { Fill will be download / Unable to find file }
    */

    downloadWav(@Res() res, @Query() queryParam) {
        const { name } = queryParam;
        const file = `${name}.csv`;
        const filePath = `${process.env.UPLOAD_DIRECTORY}${file}`;
        res.download(filePath);
	/*fs.unlink( filePath , ( result ) => {
            Logger.debug( `${file} file deleted` );
        } );*/
    }

    @Get('campaign/list')
    @getDecoraters("Camapign get successfully", "To fetch campigns (OB / BL / VB)")

    /*
    @Usage                          : To get campaigns (OB / BL / VB)
    @Method                         : GET
    @return success / error object  : Array of an object with  with data of all campaigns
    */

    getCampaignList(@Query() queryParams) {
        return this.lead_group.getCampaignList(queryParams);
    }
}
