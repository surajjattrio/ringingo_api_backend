import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query , HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateInboundCampaignDto } from "../dto/create-inbound-campaign.dto";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { InboundCampaignService } from "../services/inbound-campaign.service";
import { InboundCampaignDispositionDto } from "../dto/inbound-campaign-disposition.dto";
import { InboundCallQueueDto } from "../dto/inbound-call-queue.dto";

@Controller("inbound-campaign")

/*@Usage : To provide title of API in swagger */
@ApiTags("Inbound Campaign")

export class InboundCampaignController {

    /*
    @Usage  : To load inbound campaign and other libraries
    @return : Object[inbound_campaign] 
    */

    constructor(
        private readonly inbound_campaign: InboundCampaignService
    ) { }

    @Post()
    @postDecoraters("Inbound campaign created successfully", "Create a new inbound campaign")

    /*
    @Usage                          : To create new inbound campaign
    @Method                         : POST
    @Param name                     : string
    @Param outgoing_rule_uuid       : string
    @Param call_queue_uuid          : string
    @Param status                   : string 
    @Param sticky_agent             : string
    @Param type                     : string[Default 0]  
    @Param recording                : string
    @Param number_masking           : string
    @return success / error object  : { Inbound campaign created successfully / Inbound campaign already exist}
    */

    create(@Body() createInboundCampaignDto: CreateInboundCampaignDto) {
        return this.inbound_campaign.create(createInboundCampaignDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved tenants successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search inbound campaign
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of inbound campaign with data
    */

    advancedSearch(@Body() searchData) {
        return this.inbound_campaign.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all inbound campaign successfully", "List all inbound campaign")

    /*
    @Usage  : List all inbound campaign
    @Method : GET
    @return : Array of an object with total count of inbound campaign with data
    */

    findAll(@Query() queryParam) {
        return this.inbound_campaign.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single inbound campaign successfully", "List single inbound campaign using uuid")

    /*
    @Usage               : List single inbound campaign using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid inbound campaign
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.inbound_campaign.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Inbound campaign update successfully", "Update single inbound campaign using uuid")

    /*
    @Usage                          : Update single inbound campaign using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param outgoing_rule_uuid       : string
    @Param call_queue_uuid          : string
    @Param status                   : string
    @Param sticky_agent             : string
    @Param type                     : string[ Default [0]]
    @Param recording                : string
    @Param number_masking           : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Inbound campaign updated successfully / Inbound campaign already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createInboundCampaignDto: CreateInboundCampaignDto) {
        return this.inbound_campaign.update(id, createInboundCampaignDto);
    }

    @Patch(':uuid')
    @putDecoraters("Inbound campaign status update successfully", "Update single inbound campaign status using uuid")

    /*
    @Usage               : Update single inbound campaign using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Inbound campaign status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.inbound_campaign.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Inbound campaign deleted successfully", "Delete single or multiple inbound campaign using uuid")

    /*
    @Usage               : Delete single or multiple inbound campaign using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single inbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Inbound campaign deleted successfully / Inbound campaign not found}
    */

    remove(@Param('uuid') id: string) {
        return this.inbound_campaign.remove(id);
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
        const { tenant_uuid , campaign_type } = queryParams;
        let result, projection;
        switch (feature) {
            case "call-queue":
                projection = { allow_call_queue_transfer: 1, _id: 0 };
                result = this.inbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid , campaign_type);
                break;
            case "ivr":
                projection = { allow_ivr_transfer: 1, _id: 0 };
                result = this.inbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid , campaign_type);
                break;
            case "webform":
                projection = { webform_uuid: 1, _id: 0 };
                result = this.inbound_campaign.fetchList( campaign_uuid, projection, tenant_uuid, campaign_type );
                break;
            default: // ring group
                projection = { allow_ring_group_transfer: 1, _id: 0 };
                result = this.inbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid , campaign_type);
                break;
        }
        return result;
    }

    /**************************** Hangup Status Inbound Campaign ********************************/
@Get("/disposition/:uuid")
    @getDecoraters("Retrieved all outbound campaign successfully", "List all outbound campaign")

    /*
    @Usage  : List all Hangup status
    @Method : GET
    @return : Array of an object with total count of Hangup status with data
    */

 findAllHangupStatus(@Param('uuid') id: string) {
        return this.inbound_campaign.findAllHangupStatus(id);
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

    addDispositionFromCampaign(@Body() inboundCampaignDispositionDto: InboundCampaignDispositionDto) {
        return this.inbound_campaign.addDispositionFromCampaign(inboundCampaignDispositionDto);
    }

    @Delete('inbound-campaign-disposition/:uuid')
    @deleteDecoraters("Campaign disposition deleted successfully", "Delete single or multiple disposition using uuid")

    /*
    @Usage                          : Delete single or multiple campaign disposition using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single campaign disposition pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Campaign disposition deleted successfully / Campaign disposition not found}
    */

    removeCampaignDisposition(@Param('uuid') id: string) {
        return this.inbound_campaign.removeCampaignDisposition(id);
    }


    /**************************** Call queue Inbound Campaign ********************************/

    @Post("/call-queue/:feature")
    @postDecoraters("Agent added in call queue successfully", "Create a new agent in call queue")

    /*
    @Usage                          : To create a new agent in call queue
    @Method                         : POST
    @Param extension                : string
    @Param domain                   : string
    @return success / error object  : { Agent added in call queue successfully / Unable to add agent in call queue}
    */

    addAgentInQueueAndTier(@Body() inboundCallQueueDto: InboundCallQueueDto, @Param() param) {
        const { feature } = param;
        const { pause } = inboundCallQueueDto;
        let result, agentState;
        console.log("feature",feature);    
        switch (feature) {
            case "resume":
                agentState = "Waiting";
                result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                break;
            case "hang-up":
                agentState = "Idle";
                result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                break;
            case "submit":
                if (pause === 'true' || (pause as any) === true) {
                    agentState = "Idle";
                    result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                } else {
                    agentState = "Waiting";
                    result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                }
                // if (pause) {
                //     result = { statusCode: HttpStatus.OK, message: "Agent status set to pause" };
                // } else {
                //     agentState = "Waiting";
                //     result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                // }
                break;
            case "logout":
                result = this.inbound_campaign.addAgentInQueueAndTier(inboundCallQueueDto, agentState, feature);
                break;

        }
        return result;
    }

  }
