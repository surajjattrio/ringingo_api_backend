import { Body, Controller, Delete, Get, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { randomUUID } from "crypto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateOutboundCampaignDto } from "../dto/create-outbound-campaign.dto";
import { OutboundCampaignService } from "../services/outbound-campaign.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { OutboundCampaignDispositionDto } from "../dto/outbound-campaign-disposition";
import { OutboundCampaignDialableStatusDto } from "../dto/outbound-campaign-dialable-status.dto";
import { ResetLeadDto } from "../dto/reset-lead.dto";
import { LeadResetProducerService } from "../lead-reset-queue/lead-reset-producer.service";

@Controller("outbound-campaign")

/*@Usage : To provide title of API in swagger */
@ApiTags("Outbound Campaign")

export class OutboundCampaignController {

    /*
    @Usage  : To load outbound campaign and other libraries
    @return : Object[outbound_campaign] 
    */

    constructor(
        private readonly outbound_campaign: OutboundCampaignService,
        private readonly leadResetProducer: LeadResetProducerService
    ) { }

    @Post()
    @postDecoraters("Outbound campaign created successfully", "Create a new outbound campaign")

    /*
    @Usage                          : To create new outbound campaign
    @Method                         : POST
    @Param name                     : string
    @Param dial_method              : string
    @Param lead_group_uuid          : string
    @Param outgoing_rule_uuid       : string
    @Param status                   : string
    @return success / error object  : { Outbound campaign created successfully / Outbound campaign already exist}
    */

    create(@Body() createOutboundCampaignDto: CreateOutboundCampaignDto) {
        return this.outbound_campaign.create(createOutboundCampaignDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved tenants successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search outbound campaign
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of outbound campaign with data
    */

    advancedSearch(@Body() searchData) {
        return this.outbound_campaign.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all outbound campaign successfully", "List all outbound campaign")

    /*
    @Usage  : List all outbound campaign
    @Method : GET
    @return : Array of an object with total count of outbound campaign with data
    */

    findAll(@Query() queryParam, @Body() body) {
        return this.outbound_campaign.findAll({...queryParam, ...body});
    }

    @Get('lead-churning-data')
    @getDecoraters("Retrieved lead churning data successfully", "Get campaign-wise lead group disposition breakdown for re-churning")

    /*
    @Usage  : Get all campaigns with their lead groups and per-disposition breakdown
    @Method : GET
    @return : Array of campaigns with nested lead groups and dispositions
    */

    getLeadChurningData(@Query() queryParam) {
        return this.outbound_campaign.getLeadChurningData(queryParam);
    }

    @Get('lead-reset-status')
    @getDecoraters("Retrieved lead reset job status successfully", "Poll the status of a queued lead reset job")

    /*
    @Usage             : Poll the status of a lead-reset job queued via POST lead-reset
    @Method            : GET
    @Param job_uuid    : uuid returned by POST lead-reset
    @Param tenant_uuid : scopes the lookup to the requesting tenant
    @return object     : lead_reset_jobs document — status is one of pending/inprogress/completed/failed
    */

    getLeadResetJobStatus(@Query('job_uuid') job_uuid: string, @Query('tenant_uuid') tenant_uuid: string) {
        return this.outbound_campaign.getLeadResetJobStatus(job_uuid, tenant_uuid);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single outbound campaign successfully", "List single outbound campaign using uuid")

    /*
    @Usage               : List single outbound campaign using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid outbound campaign
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.outbound_campaign.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Outbound campaign update successfully", "Update single outbound campaign using uuid")

    /*
    @Usage                          : Update single outbound campaign using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param dial_method              : string
    @Param lead_group_uuid          : string
    @Param outgoing_rule_uuid       : string
    @Param status                   : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Outbound campaign updated successfully / Outbound campaign already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createOutboundCampaignDto: CreateOutboundCampaignDto) {
        return this.outbound_campaign.update(id, createOutboundCampaignDto);
    }

    @Patch(':uuid')
    @putDecoraters("Outbound campaign status update successfully", "Update single outbound campaign status using uuid")

    /*
    @Usage               : Update single outbound campaign using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Outbound campaign status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.outbound_campaign.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Outbound campaign deleted successfully", "Delete single or multiple outbound campaign using uuid")

    /*
    @Usage               : Delete single or multiple outbound campaign using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single outbound campaign pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Outbound campaign deleted successfully / Outbound campaign not found}
    */

    remove(@Param('uuid') id: string) {
        return this.outbound_campaign.remove(id);
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

    outboundCampaignOtherFeature(@Param() params: any, @Query() queryParams) {
        const { feature, uuid } = params;
        const { tenant_uuid } = queryParams;
        let result;
        switch (feature) {
            case "lead":
                result = this.outbound_campaign.getLeads(queryParams,uuid)
                break;
            case "dialable":
                result = this.outbound_campaign.getDispositions(tenant_uuid, uuid);
                break;
            case "hangup-status":
                result = this.outbound_campaign.getDispositions(tenant_uuid, uuid, "campaign");
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

    addDispositionFromCampaign(@Body() outboundCampaignDispositionDto: OutboundCampaignDispositionDto) {
        return this.outbound_campaign.addDispositionFromCampaign(outboundCampaignDispositionDto);
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

    addDialableStatusFromCampaign(@Body() outboundCampaignDialableStatusDto: OutboundCampaignDialableStatusDto) {
        return this.outbound_campaign.addDialableStatusFromCampaign(outboundCampaignDialableStatusDto);
    }


    @Get("/dialable/list/all")
    @getDecoraters("Retrieved all outbound campaign successfully", "List all outbound campaign")

    /*
    @Usage  : List all dialable status
    @Method : GET
    @return : Array of an object with total count of dialable status with data
    */

    findAllDialableStatus(@Query() queryParam) {
        return this.outbound_campaign.findAllDialableStatus(queryParam);
    }

    @Get('list/campaign/voice-broadcast-outbound')
    @getDecoraters("Retrieved outbound and voice broadcast", "List single outbound and voice broadcast")

    /*
    @Usage               : List single outbound and voice broadcast 
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Array contains outbound campaign & voice broadcast
    */

    fetchOutboundAndVoiceBroadcastCampaign(@Query() queryParam) {
        return this.outbound_campaign.fetchOutboundAndVoiceBroadcastCampaign(queryParam);
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
        return this.outbound_campaign.removeDailableStatus(id);
    }

    @Post('lead-reset')
    @putDecoraters("Lead reset successfully", "Queue (or, if disabled, synchronously run) a lead reset using uuid")

    /*
    @Usage               : Remove/re-add leads in queue based on lead group uuid. When
                            ENABLE_LEAD_RECHURN_MICROSERVICE=true, queues the job to RabbitMQ for the
                            standalone lead-churning consumer to process (202 + job_uuid, or 503 if it
                            could not be queued) — resetLeads() itself is unchanged, only invoked from a
                            queue message instead of this request. When unset/false, falls back to the
                            original synchronous behaviour (resetLeads() called directly, same response
                            shape as before this migration).
    @Method              : POST
    @Param uuid          : uuid of lead group will receive here
    @return object       : { job_uuid } (async) or resetLeads()'s own response (sync fallback)
    */

    async ResetLeads(@Body() resetLeadDto: ResetLeadDto, @Res({ passthrough: true }) response: Response) {
        if (process.env.ENABLE_LEAD_RECHURN_MICROSERVICE !== 'true') {
            return this.outbound_campaign.resetLeads(resetLeadDto);
        }

        const job_uuid = randomUUID();
        await this.leadResetProducer.publishJob(job_uuid, resetLeadDto);
        response.status(HttpStatus.ACCEPTED);
        return { job_uuid };
    }

    @Delete('outbound-campaign-disposition/:uuid')
    @deleteDecoraters("Campaign disposition deleted successfully", "Delete single or multiple disposition using uuid")

    /*
    @Usage                          : Delete single or multiple campaign disposition using uuid
    @Method                         : DELETE
    @Param  uuid                    : To delete single campaign disposition pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Campaign disposition deleted successfully / Campaign disposition not found}
    */

    removeCampaignDisposition(@Param('uuid') id: string) {
        return this.outbound_campaign.removeCampaignDisposition(id);
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
        return this.outbound_campaign.updateLeadGroup(resetLeadDto);
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
                result = this.outbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
                break;
            case "ivr":
                projection = { allow_ivr_transfer: 1, _id: 0 };
                result = this.outbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
                break;
            case "webform":
                projection = { webform_uuid: 1, _id: 0 };
                result = this.outbound_campaign.fetchList( campaign_uuid, projection, tenant_uuid );
                break;
            default: // ring group
                projection = { allow_ring_group_transfer: 1, _id: 0 };
                result = this.outbound_campaign.fetchList(campaign_uuid, projection , tenant_uuid);
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
        return this.outbound_campaign.deleteQueues(resetLeadDto);
    }

    @Put( 'outbound-campaign-dial/:uuid' )
    @putDecoraters( "Outbound campaign dial level  update successfully", "Update single outbound campaign dial level  using uuid" )

    /*
    @Usage                          : Update single outbound campaign using uuid
    @Method                         : PUT
    @Param dial_level             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Outbound campaign dial level updated successfully / Outbound campaign already exist}
    */

    campaign_dial_level ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() body: any ) {
        return this.outbound_campaign.campaign_dial_level( id, body );
    }
}
