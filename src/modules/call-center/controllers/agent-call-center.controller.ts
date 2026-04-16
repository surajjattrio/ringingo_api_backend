import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Delete, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters, deleteDecoraters } from "src/swagger/swagger_decoraters";
import { AgentCallCenterService } from "../services/agent-call-center.service";
import { LeadStatusLeadManagementDto } from "../dto/lead-status-lead-management";
import { LeadSkipDto } from "../dto/lead-skip.dto";
import { ResumeDto } from "../dto/resume.dto";
import { PauseDto } from "../dto/pause.dto";
import { AgentLoginLogoutReportDto } from "../dto/agent-login-logout-report.dto";
import { AgentStatusForNewCall } from "../dto/agent-status-for-new-call.dto";
import { AgentLiveReportDto } from "../dto/agent-live-report.dto";
import { UpdateAgentLiveReportDto } from "../dto/update-agent-live-report.dto";
import { DialLevelDto } from "../dto/dial-level.dto";
import { UpdateLeadStatusSentDto } from "../dto/update-lead-status-sent.dto";
import { CreateInboundBlockCampaignAgentDto } from "src/modules/campaigns/block-inbound-campaign/dto/create-inbound-block-campaign-agent.dto";
// import { ArchieveWhatsappMessaggeDto } from "../dto/archieve_whataspp_message.dto";
import { ArchieveOmniMessaggeDto } from "../dto/archive_omni_message.dto";
import { Public } from "src/global_constant";

@Controller("agent-call-center")

/*@Usage : To provide title of API in swagger */
@ApiTags("Agent Call Center")


export class AgentCallCenterController {

    /*
    @Usage  : To load agent call center service and other libraries
    @return : Object[agent_call_center]
    */

    constructor(private readonly agent_call_center: AgentCallCenterService) { }

    @Get("/:feature")
    @getDecoraters("Retrieved campaign successfully", "List all campaign")

    /*
    @Usage  : List all campaign
    @Method : GET
    @return : Array of an object with total count of campaign with data
    */

    findAll(@Query() queryParam, @Param() params, @Req() req) {
        const { feature } = params;
        let result;

        switch (feature) {
            case "campaign":
                result = this.agent_call_center.findAll(queryParam);
                break;
            case "all-leads":
                const { uuid, tenant_uuid, role } = req.user;
                queryParam.uuid = uuid;
                queryParam.tenant_uuid = tenant_uuid;
                queryParam.role = role;
                result = this.agent_call_center.getCampaignLeads(queryParam);
                break;
            case "all-notes":
                result = this.agent_call_center.getNotes(queryParam);
                break;
            case "top10-cdrs":
                result = this.agent_call_center.getTop10Cdrs(queryParam);
                break;
        }

        return result;
    }

    @Patch('hangup/:lead_management_uuid')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage               : Update single lead status using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    patch(@Param('lead_management_uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() leadStatusLeadManagementDto: LeadStatusLeadManagementDto, @Req() req) {
        const { uuid, tenant_uuid } = req.user;
        leadStatusLeadManagementDto.user_uuid = uuid;
        leadStatusLeadManagementDto.tenant_uuid = tenant_uuid;
        return this.agent_call_center.patch(id, leadStatusLeadManagementDto);
    }

    /* For campaign mode : Preview */

    @Patch('skip/:lead_management_uuid')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage               : Skip single lead
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    skipLead(@Param('lead_management_uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() leadSkipDto: LeadSkipDto, @Req() req) {
        const { uuid, tenant_uuid } = req.user;
        leadSkipDto.uuid = uuid;
        leadSkipDto.tenant_uuid = tenant_uuid;
        return this.agent_call_center.skipLead(id, leadSkipDto);
    }

    @Post("/update-lead-status-sent")
    @postDecoraters("Lead status set to sent", "To set lead status to sent")

    /*
    @Usage               : To set lead status to sent
    @Method              : POST
    @Param               : Single or multiple params will receive here
    @return string       : Lead status to sent updated successfully
    */

    updateLeadStatusToSent(@Body() updateLeadStatusSentDto: UpdateLeadStatusSentDto) {
        return this.agent_call_center.updateLeadStatusToSent(updateLeadStatusSentDto);
    }


    /********************** For Auto Campaign Mode *****************************/

    @Post("/resume")
    @postDecoraters("Agent data added successfully", "To check agent exist or not")

    /*
    @Usage               : To add agent into auto_campaign_origination
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    checkAgentExistInCollection(@Body() resumePauseDto: ResumeDto) {
        return this.agent_call_center.checkAgentExistInCollection(resumePauseDto);
    }

    @Patch("/pause")
    @postDecoraters("Agent status updated successfully", "To update agent status")

    /*
    @Usage               : To update agent status
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Agent status updated successfully
    */

    updateAgentStatus(@Body() pauseDto: PauseDto, @Req() req) {
        const { uuid, tenant_uuid } = req.user;
        pauseDto.agent_uuid = uuid;
        pauseDto.tenant_uuid = tenant_uuid;
        return this.agent_call_center.updateAgentStatus(pauseDto);
    }

    @Patch("/agent-status")
    @postDecoraters("Agent status updated successfully", "To update agent status")

    /*
    @Usage               : To update agent status
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Agent status updated successfully
    */

    updateAgentStatusForNewCall(@Body() pauseDto: AgentStatusForNewCall, @Req() req) {
        const { uuid, tenant_uuid } = req.user;
        pauseDto.agent_uuid = uuid;
        pauseDto.tenant_uuid = tenant_uuid;
        return this.agent_call_center.updateAgentStatusForNewCall(pauseDto);
    }

    /********************** Agent login logout Report *****************************/

    @Post("/add-agent-entry")
    @postDecoraters("Add agent entry added successfully", "To add agent entry")

    /*
    @Usage               : To add agent entry into agent_login_logout_report
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    addAgentEntry(@Body() agentLoginLogoutReportDto: AgentLoginLogoutReportDto) {
        return this.agent_call_center.addAgentEntry(agentLoginLogoutReportDto);
    }

    @Get("/login-logout-report/list")
    @getDecoraters("Retrieved all login logout report successfully", "List all login logout report")

    /*
    @Usage            : To fetch all login logout report
    @Method           : GET
    @Param req        : LoggedIn user details
    @return Object    : Array of an object with total count of campaign with data
    */

    fetchLoginLogoutReportStatistics(@Query() queryParam) {
        return this.agent_call_center.fetchLoginLogoutReportStatistics(queryParam);
    }


    @Get("/login-logout-report/entries")
    @getDecoraters("Retrieved all login logout report successfully", "List all login logout report")

    /*
    @Usage            : To fetch all login logout report entries based on date
    @Method           : GET
    @Param queryParam : Params receive with request
    @return Object    : Array of an object with total count of login logout with data
    */

    fetchLoginLogoutEntries(@Query() queryParam) {
        return this.agent_call_center.fetchLoginLogoutEntries(queryParam);
    }


    @Post("/login-logout-report/advanced-search")
    @postDecoraters("Retrieved all login logout report successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search cdrs
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of cdrs with data
    */

    advancedSearch(@Body() searchData) {
        return this.agent_call_center.advancedSearch(searchData);
    }

    /********************** Agent Campaign Report *****************************/

    @Post("/agent-campaign/:feature")
    @postDecoraters("Add entry OR busy entry for agent in campaign", "To add OR busy entry agent campaign entry")

    /*
    @Usage                   : To add OR busy entry agent campaign entry
    @Method                  : POST
    @Param AgentCampaignInfo : Campaign information with agent
    @return Object           : Success / Error
    */

    agentCampaignEntries(@Body() addAgentCampaignEntry, @Req() req, @Param() param) {

        const { feature } = param;
        let result;
        switch (feature) {
            case "login-entry":
                result = this.agent_call_center.addAgentCampaignLoginEntry(addAgentCampaignEntry, req.user);
                break;
            case "busy-entry":
                result = this.agent_call_center.addAgentCampaignBusyEntry(req.user);
                break;
            case "logout-entry":
                result = this.agent_call_center.agentlogoutCampaign(req.user);
                break;
        }
        return result;
    }

    @Get("/campaign/list")
    @getDecoraters("Retrieved campaign successfully", "List all campaign")

    /*
    @Usage            : To fetch all campaign with status
    @Method           : GET
    @Param req        : LoggedIn user details
    @return Object    : Array of an object with total count of campaign with data
    */

    fetchCampaigns(@Req() req) {
        return this.agent_call_center.fetchCampaigns(req.user);
    }


    @Get("/logged-in-campaign/list")
    @getDecoraters("Retrieved campaign successfully", "List all campaign")

    /*
    @Usage            : To get logged in campaign details
    @Method           : GET
    @Param req        : LoggedIn user details
    @return Object    : Array of an object with total count of campaign with data
    */

    getCampaignsForLoggedInAgent(@Req() req) {
        return this.agent_call_center.getCampaignsForLoggedInAgent(req.user);
    }


    /********************** Agent Lead Status *****************************/

    @Get("/lead-status/list")
    @getDecoraters("Retrieved lead status successfully", "List all lead status")

    /*
    @Usage            : To fetch all lead status
    @Method           : GET
    @return Object    : Array of an object with total count of lead status with data
    */

    fetchAllLeadStatus() {
        //For now it's static
        let leadStatus = ["New", "Low", "Medium", "High", "Important", "Hot"];
        return {
            statusCode: 200,
            lead_status: leadStatus
        };
    }


    /********************** Agent Live Report *****************************/

    @Post("/add-entry-live-report")
    @postDecoraters("Add agent entry added successfully", "To add agent entry")

    /*
    @Usage               : To add agent entry into agent_live_report
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    addAgentEntryInLiveReport(@Body() agentLiveReportDto: AgentLiveReportDto) {
        return this.agent_call_center.addAgentEntryInLiveReport(agentLiveReportDto);
    }

    @Patch("/update-entry-live-report/:campaign_uuid")
    @postDecoraters("Update agent entry successfully", "To update agent entry")

    /*
    @Usage               : To update agent entry into agent_live_report
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    //Removed new ParseUUIDPipe({ version: '4' })
    updateAgentEntryInLiveReport(@Param('campaign_uuid') id: string, @Body() updateAgentLiveReportDto: UpdateAgentLiveReportDto, @Req() req) {
        return this.agent_call_center.updateAgentEntryInLiveReport(updateAgentLiveReportDto, req.user, id);
    }

    @Delete('live-report/:uuid')
    @deleteDecoraters("Agent deleted successfully", "Delete agent using uuid")

    /*
    @Usage               : Delete agent using uuid
    @Method              : DELETE
    @Param  uuid         : uuid of agent
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Agent deleted successfully / Agent not found}
    */

    remove(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.agent_call_center.remove(id);
    }


    /********************** Call queue list for agent portal *****************************/

    @Get("/call-queue/list/:inbound_campaign_uuid")
    @getDecoraters("Retrieved lead status successfully", "List all lead status")

    /*
    @Usage            : To fetch calls in queue[inbound campaign]
    @Method           : GET
    @return Object    : Array of an object with total count of call queue with data
    */

    fetchCallQueueList(@Param('inbound_campaign_uuid') inbound_campaign_uuid: string, @Query() queryParams) {
        return this.agent_call_center.fetchCallQueueList(inbound_campaign_uuid, queryParams);
    }


    /********************** For Predective Mode *****************************/

    @Put("/update-dial-level/:campaign_uuid/:campaign_flag")
    @putDecoraters("Update agent entry successfully", "To update agent entry")

    /*
    @Usage               : To update agent entry into agent_live_report
    @Method              : Put
    @return string       : Dial-Level updated successfully
    */
    updateDialLevel(@Param() param) {
        const { campaign_uuid, campaign_flag } = param
        return this.agent_call_center.updateDialLevel(campaign_uuid, campaign_flag);
    }


    /********************************* For Realtime Report ************************************/

    @Put("/:feature/:operation")
    @putDecoraters("Status update successfully", "To update tenant count")

    /*
    @Usage            : To update tenant count[inbound campaign]
    @Method           : PUT
    @return Object    : Success / Error
    */

    manageCallRinging(@Param() param, @Req() req) {
        let result;
        const { feature, operation } = param;
        const { tenant_uuid } = req.user;
        result = this.agent_call_center.manageCallRinging(tenant_uuid, operation, feature);
        return result;
    }


    // @Get( "/call-waiting/count/:tenant_uuid" )
    @Get("/call-waiting/count")
    @getDecoraters("Retrieved lead status successfully", "List all lead status")

    /*
   @Usage                 : To get call waiting for agent
   @Param collection_name : agent_live_report
   @Param uuid            : Agent UUID
   @Param logMessage      : Object with error & success response and message
   @return Object         : Result of call waiting for outbound and inbound
   */

    // fetchAgentCallWaiting ( @Param( 'tenant_uuid' ) tenant_uuid: string, @Query() queryParams ) {
    fetchAgentCallWaiting(@Query() queryParams) {
        return this.agent_call_center.fetchAgentCallWaiting(queryParams);
    }

    @Get("/getcallwaitingcount/count")
    @getDecoraters("Retrieved all call waiting count successfully", "Show all the call waiting count")

    /*
    @Usage            : To fetch all call waiting count
    @Method           : GET
    @Param req        : LoggedIn user details
    @return Object    : Array of an object with total count of campaign with data
    */

    fetchcallwaitingcount(@Query() queryParam) {
        return this.agent_call_center.fetchcallwaitingcount(queryParam);
    }

    @Post("/add-blacklist-entry")
    @postDecoraters("Add Blacklist entry added successfully", "To add Blacklist")

    /*
    @Usage               : To add agent entry into blacklist
    @Method              : POST
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    addblacklistentry(@Body() createInboundBlockCampaignAgentDto: CreateInboundBlockCampaignAgentDto, @Req() req,) {
        return this.agent_call_center.addblacklistentry(createInboundBlockCampaignAgentDto, req.user);
    }


    @Post("/send-webform")
    @postDecoraters("Send WebForm Data successfully", "To send webform data")

    /*
    @Usage               : To send webform data
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Send WebForm Data successfully
    */

    sendwebformdata(@Body() sendwebformdata) {
        console.log(sendwebformdata);
        return this.agent_call_center.sendwebformdata(sendwebformdata);
    }

    // @Post("/end-chat")
    // @postDecoraters("Send WebForm Data successfully", "To send webform data")

    /*
    @Usage               : To send webform data
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Send WebForm Data successfully
    */

    // endchat(@Body() archievewhatsappmessagedto: ArchieveWhatsappMessaggeDto) {
    //     // console.log( sendwebformdata );
    //     return this.agent_call_center.endchat(archievewhatsappmessagedto);
    // }

    @Put('/transfer-chat')
    @putDecoraters("chat transfered successfully", "transfer chat using user uuid")

    /*
    @Usage               : transfer chat using user uuid
    @Method              : PUT
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Did updated successfully / number already exist}
    */

    transferchat(@Body() transferdata) {
        console.log(transferdata);
        return this.agent_call_center.transferchat(transferdata);
        // return this.did.update(id, CreateDidDto);
    }

    // @Post("/get-whatsapp-history")
    // @postDecoraters("Retrieved all whatsapp-history successfully", "Show all whatsapp-history")

    /*
    @Usage            : To fetch all whatsapp-history
    @Method           : GET
    @Param req        : LoggedIn user details 
    @return Object    : Array of an object with total count of campaign with data
    */

    // fetchpreviouschat(@Body() searchdata) {
    //     return this.agent_call_center.fetchpreviouschat(searchdata);
    // }

    @Post("/call-queue/logout")
    @postDecoraters("Logout all queue successfully", "Logout all login call-queue")

    /*
   @Usage                 : To Logout all login call-queue
   @Param collection_name : agent_campaign_login
   @Param uuid            : Agent UUID
   @Param logMessage      : Object with error & success response and message
   @return Object         : Result of logout all login call-queue
   */


    LogoutAllCallQueue(@Body() agentdata) {
        return this.agent_call_center.logoutallcallqueue(agentdata);
    }

    @Put('/update-default-messaging-channel')
    @putDecoraters("messaging channel updated successfully", "update messaging channel using user uuid")

    /*
    @Usage               : update messaging channel using user uuid
    @Method              : PUT
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { messaging channel updated successfully }
    */

    updatedefaultmessagingchannel(@Body() updatedata) {
        return this.agent_call_center.updatedefaultmessagingchannel(updatedata);
        // return this.did.update(id, CreateDidDto);
    }

    @Patch('/agent-admin-logout/:uuid')
    @putDecoraters("messaging channel updated successfully", "update messaging channel using user uuid")


    /*
    @Usage               : admin agent logout using user uuid
    @Method              : PATCH
    @return success / error object  : { admin agent logout successfully }
    */

    agentTenantLogout(@Param("uuid") agent_uuid, @Body() data) {
        return this.agent_call_center.agentTenantLogout(agent_uuid, data);
    }

    @Public()
    @Post('/login-page-logout')
    @postDecoraters("messaging channel updated successfully", "update messaging channel using user uuid")


    /*
    @Usage               : admin agent logout using user uuid
    @Method              : POST
    @return success / error object  : { admin agent logout from login page successfully }
    */

    loginPageLogout(@Body() data) {
        return this.agent_call_center.loginPageLogout(data);
    }

    @Public()
    @Post('/force-login-role')
    @postDecoraters("messaging channel updated successfully", "update messaging channel using user uuid")


    /*
    @Usage               : admin agent logout using user uuid
    @Method              : POST
    @return success / error object  : { admin agent logout from login page successfully }
    */

    forceLoginRole(@Body() data) {
        return this.agent_call_center.forceLoginRole(data);
    }

    @Post("omnichannel/get-history")
    @postDecoraters("Retrieved all whatsapp-history successfully", "Show all whatsapp-history")

    /*
    @Usage            : To fetch all whatsapp-history
    @Method           : GET
    @Param req        : LoggedIn user details 
    @return Object    : Array of an object with total count of campaign with data
    */

    fetchpreviousomnichannelchat(@Body() searchdata) {
        return this.agent_call_center.fetchpreviousomnichannelchat(searchdata);
    }

    @Post("omnichannel/end-chat")
    @postDecoraters("Send WebForm Data successfully", "To send webform data")

    /*
    @Usage               : To send webform data
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Send WebForm Data successfully
    */

    omnichannelendchat(@Body() archieveomnimessagedto: ArchieveOmniMessaggeDto) {
        // console.log( sendwebformdata );
        return this.agent_call_center.omnichannelendchat(archieveomnimessagedto);
    }

}

