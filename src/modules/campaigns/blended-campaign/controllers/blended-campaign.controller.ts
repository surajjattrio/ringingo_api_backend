import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { BlendedCampaignService } from "../services/blended-campaign.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { BlendedCampaignDispositionDto } from "../dto/blended-campaign-disposition";
import { BlendedCampaignDialableStatusDto } from "../dto/blended-campaign-dialable-status.dto";
import { ResetLeadDto } from "../../outbound-campaign/dto/reset-lead.dto";
import { CreateBlendedCampaignDto } from "../dto/create-blended-campaign.dto";

@Controller("blended-campaign")

/*@Usage : To provide title of API in swagger */
@ApiTags("Blended Campaign")

export class BlendedCampaignController {

    /*
    @Usage  : To load outbound campaign and other libraries
    @return : Object[blended_campaign] 
    */

    constructor(
        private readonly blended_campaign: BlendedCampaignService
    ) { }

    @Post()
    @postDecoraters("Blended campaign created successfully", "Create a new blended campaign")

    /*
    @Usage                          : To create new blended campaign
    @Method                         : POST
    @Param name                     : string
    @Param dial_method              : string
    @Param lead_group_uuid          : string
    @Param outgoing_rule_uuid       : string
    @Param status                   : string
    @return success / error object  : { blended campaign created successfully / blended campaign already exist}
    */

    create(@Body() createBlendedCampaignDto: CreateBlendedCampaignDto) {
        return this.blended_campaign.create(createBlendedCampaignDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved blended campaign successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search blended campaign
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of outbound campaign with data
    */

    advancedSearch(@Body() searchData) {
        return this.blended_campaign.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all blended campaign successfully", "List all blended campaign")

    /*
    @Usage  : List all blended campaign
    @Method : GET
    @return : Array of an object with total count of blended campaign with data
    */

    findAll(@Query() queryParam) {
        return this.blended_campaign.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single blended campaign successfully", "List single blended campaign using uuid")

    /*
    @Usage               : List single blended campaign using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid blended campaign
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.blended_campaign.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Blended campaign update successfully", "Update single blended campaign using uuid")

    /*
    @Usage                          : Update single blended campaign using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param dial_method              : string
    @Param lead_group_uuid          : string
    @Param outgoing_rule_uuid       : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Blended campaign updated successfully / Blended campaign already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createBlendedCampaignDto: CreateBlendedCampaignDto) {
        return this.blended_campaign.update(id, createBlendedCampaignDto);
    }

    @Patch(':uuid')
    @putDecoraters("Blended campaign status update successfully", "Update single blended campaign status using uuid")

    /*
    @Usage               : Update single blended campaign using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Blended campaign status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.blended_campaign.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Blended campaign deleted successfully", "Delete single or multiple blended campaign using uuid")

    /*
    @Usage               : Delete single or multiple blended campaign using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single blended campaign pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Blended campaign deleted successfully / Blended campaign not found}
    */

    remove(@Param('uuid') id: string) {
        return this.blended_campaign.remove(id);
    }

    /***** OTHER FEATURE ***********/

    @Get(':feature/:uuid')
    @getDecoraters("To update lead group and dialable status", "List single lead group and dialable status")

    /*
    @Usage               : To list lead group and dialable status
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular feature[lead group and dialable status]
    */

    blendedCampaignOtherFeature(@Param() params: any, @Query() queryParams) {
        const { feature, uuid } = params;
        const { tenant_uuid } = queryParams;
        let result;
        switch (feature) {
            case "lead":
                result = this.blended_campaign.getLeads(queryParams,uuid)
                break;
            case "dialable":
                result = this.blended_campaign.getDispositions(tenant_uuid, uuid);
                break;
            case "hangup-status":
                result = this.blended_campaign.getDispositions(tenant_uuid, uuid, "campaign");
                break;
        }
        return result;
    }

    @Post("/disposition")
    @postDecoraters("Hangup status created successfully", "Create a new hangup status")

    /*
    @Usage                          : To create new hangup status
    @Method                         : POST
    @Param name                     : string
    @Param dial_method              : string
    @return success / error object  : { Hangup status created successfully / Hangup status already exist}
    */

    addDispositionFromCampaign(@Body() blendedCampaignDispositionDto: BlendedCampaignDispositionDto) {
        return this.blended_campaign.addDispositionFromCampaign(blendedCampaignDispositionDto);
    }

    @Post("/add-dialable")
    @postDecoraters("Dialable status added successfully", "Create a new dialable status")

    /*
    @Usage                          : To create new dialable status
    @Method                         : POST
    @Param name                     : string
    @Param dial_method              : string
    @return success / error object  : { Dialable status added successfully / Dialable status already exist}
    */

    addDialableStatusFromCampaign(@Body() blendedCampaignDialableStatusDto: BlendedCampaignDialableStatusDto) {
        return this.blended_campaign.addDialableStatusFromCampaign(blendedCampaignDialableStatusDto);
    }


    @Get("/dialable/list/all")
    @getDecoraters("Retrieved all blended campaign successfully", "List all blended campaign")

    /*
    @Usage  : List all dialable status
    @Method : GET
    @return : Array of an object with total count of dialable status with data
    */

    findAllDialableStatus(@Query() queryParam) {
        return this.blended_campaign.findAllDialableStatus(queryParam);
    }

    @Get('list/campaign/voice-broadcast-blended')
    @getDecoraters("Retrieved blended and voice broadcast", "List single blended and voice broadcast")

    /*
    @Usage               : List single blended and voice broadcast 
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Array contains blended campaign & voice broadcast
    */

    fetchBlendedAndVoiceBroadcastCampaign(@Query() queryParam) {
        return this.blended_campaign.fetchBlendedAndVoiceBroadcastCampaign(queryParam);
    }

    @Delete('dailable/:uuid')
    @deleteDecoraters("Dailable status deleted successfully", "Delete single or multiple dailable status using uuid")

    /*
    @Usage                          : Delete single or multiple dailable status campaign using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single dailable status pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Dailable status deleted successfully / Dailable status not found}
    */

    removeDailableStatus(@Param('uuid') id: string) {
        return this.blended_campaign.removeDailableStatus(id);
    }

    @Post('lead-reset')
    @putDecoraters("Lead reset successfully", "Update single lead reset using uuid")

    /*
    @Usage               : Remove all leads from queue based on lead group uuid
    @Method              : POST
    @Param uuid          : uuid of lead group will receive here
    @return string       : Lead reset updated successfully
    */

    ResetLeads(@Body() resetLeadDto: ResetLeadDto) {
        return this.blended_campaign.resetLeads(resetLeadDto);
    }

    @Delete('blended-campaign-disposition/:uuid')
    @deleteDecoraters("Campaign disposition deleted successfully", "Delete single or multiple disposition using uuid")

    /*
    @Usage                          : Delete single or multiple campaign disposition using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single campaign disposition pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Campaign disposition deleted successfully / Campaign disposition not found}
    */

    removeCampaignDisposition(@Param('uuid') id: string) {
        return this.blended_campaign.removeCampaignDisposition(id);
    }

    @Post('update-lead-group')
    @putDecoraters("Lead group deleted successfully from campaign", "To delete lead group from campaign")

    /*
    @Usage               : To delete lead group from campaign
    @Method              : POST
    @Param resetLeadDto  : Request DTO
    @return string       : Lead group deleted successfully from campaign
    */

    updateLeadGroup(@Body() resetLeadDto: ResetLeadDto) {
        return this.blended_campaign.updateLeadGroup(resetLeadDto);
    }

    @Get('list/:feature/:campaign_uuid')
    @getDecoraters("Retrieved call queue successfully", "List call queue using uuid")

    /*
    @Usage               : List callqueue/ivr/ringgroup using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : All data for particular campaign_uuid
    */

    fetchListBasedOnCampaign(@Param() params , @Query() queryParams) {
        const { feature, campaign_uuid } = params;
        const { tenant_uuid } = queryParams;
        let result, projection;
        switch (feature) {
            case "call-queue":
                projection = { allow_call_queue_transfer: 1, _id: 0 };
                result = this.blended_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
                break;
            case "ivr":
                projection = { allow_ivr_transfer: 1, _id: 0 };
                result = this.blended_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
                break;
            case "webform":
                projection = { webform_uuid: 1, _id: 0 };
                result = this.blended_campaign.fetchList( campaign_uuid, projection, tenant_uuid );
                break;
            default: // ring group
                projection = { allow_ring_group_transfer: 1, _id: 0 };
                result = this.blended_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
                break;
        }
        return result;
    }

    @Post('remove-queues')
    @postDecoraters("Queues deleted successfully", "To delete queues")

    /*
    @Usage               : To delete queues
    @Method              : POST
    @Param resetLeadDto  : Request DTO
    @return string       : Queues deleted successfully
    */

    deleteQueues(@Body() resetLeadDto: ResetLeadDto) {
        return this.blended_campaign.deleteQueues(resetLeadDto);
    }

    @Put( 'blended-campaign-dial/:uuid' )
    @putDecoraters( "Blended campaign dial level  update successfully", "Update single blended campaign dial level  using uuid" )

    /*
    @Usage                          : Update single blended campaign using uuid
    @Method                         : PUT
    @Param dial_level             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Blended campaign dial level updated successfully / Blended campaign already exist}
    */

    campaign_dial_level ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() body: any ) {
        return this.blended_campaign.campaign_dial_level( id, body );
    }
}

