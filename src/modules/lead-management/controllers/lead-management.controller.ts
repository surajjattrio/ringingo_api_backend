import { Body, Controller, Delete, FileTypeValidator, Get, Param, ParseFilePipe, ParseUUIDPipe, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateLeadManagementDto } from "../dto/create-lead-management.dto";
import { LeadManagementService } from "../services/lead-management.service";
import { Public } from "src/global_constant";
import { TokenOrApiKeyAuthGuard } from "src/modules/auth/token_or_api_key_auth_guard";
import { AgentLeadManagementDto } from "../dto/agent-lead-management";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { LeadManagementImportDto } from "../dto/lead-management-import.dto";
import { LeadManagementImportMapperDto } from "../dto/lead-management-import-mapper.dto";
import { LeadManagementDistributionDto } from "../dto/lead-management-distribution.dto";
import { LeadBatchUpdateDto } from "../dto/lead-batch-update.dto";


@Controller("lead-management")

/*@Usage : To provide title of API in swagger */
@ApiTags("Lead Management")

export class LeadManagementController {

    /*
    @Usage  : To load lead management service and other libraries
    @return : Object[lead_management] 
    */

    constructor(private readonly lead_management: LeadManagementService) { }

    @Post()
    @postDecoraters("Lead created successfully", "Create a new lead")

    /*
    @Usage                          : To create new lead
    @Method                         : POST
    @Param first_name               : string
    @Param last_name                : string
    @Param phone_number             : string
    @Param status                   : integer [Default 0]
    @return success / error object  : { Lead created successfully / Lead already exist}
    */

    create(@Body() createLeadManagementDto: CreateLeadManagementDto) {
        return this.lead_management.create(createLeadManagementDto);
    }

    @Public()
    @UseGuards(TokenOrApiKeyAuthGuard)
    @Post("/new")
    @postDecoraters("Lead created successfully", "Create a new lead")

    /*
    @Usage                          : To create new lead
    @Method                         : POST
    @Param first_name               : string
    @Param last_name                : string
    @Param phone_number             : string
    @Param status                   : integer [Default 0]
    @return success / error object  : { Lead created successfully / Lead already exist}
    @Auth   : Validates "Authorization: Bearer <JWT>" if present, else requires "x-api-key"
    */

    createNewLead(@Body() createLeadManagementDto: CreateLeadManagementDto) {
        return this.lead_management.createNewLead(createLeadManagementDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved lead successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search lead
    @Method            : POST
    @Param domain      : Single or multiple parameters
    @return Object     : Array of an object with total count of lead with data
    */

    advancedSearch(@Body() searchData) {
        return this.lead_management.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all leads successfully", "List all leads")

    /*
    @Usage  : List all leads
    @Method : GET
    @return : Array of an object with total count of leads with data
    */

    findAll(@Query() queryParam) {
        return this.lead_management.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single lead successfully", "List single lead using uuid")

    /*
    @Usage               : List single lead using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid lead
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.lead_management.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Lead update successfully", "Update single lead using uuid")

    /*
    @Usage                          : Update single lead using uuid
    @Method                         : PUT
    @Param first_name               : string
    @Param last_name                : string
    @Param address                  : string
    @Param phone_number             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Lead updated successfully / Lead already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createLeadManagementDto: CreateLeadManagementDto) {
        return this.lead_management.update(id, createLeadManagementDto);
    }

    @Put('/new/:uuid')
    @putDecoraters("Lead update successfully", "Update single lead using uuid")

    /*
    @Usage                          : Update single lead using uuid
    @Method                         : PUT
    @Param first_name               : string
    @Param last_name                : string
    @Param address                  : string
    @Param phone_number             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Lead updated successfully / Lead already exist}
    */

    updateNew(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createLeadManagementDto: CreateLeadManagementDto) {
        return this.lead_management.updateNewLead(id, createLeadManagementDto);
    }

    @Patch(':uuid')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage               : Update single lead using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Lead status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.lead_management.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Lead deleted successfully", "Delete single or multiple lead using uuid")

    /*
    @Usage               : Delete single or multiple lead using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single lead pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Lead deleted successfully / Lead not found}
    */

    remove(@Param('uuid') id: string) {
        return this.lead_management.remove(id);
    }

    @Post("/import")
    @postDecoraters("Lead management imported successfully", "To import lead management")
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            })
        })
    )


    /*
    @Usage             : To import lead management
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of lead management
    @return Object     : Success / Error
    */

    importLeadmanagement(@Body() importData: LeadManagementImportDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid, role, parent_uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = role === 'manager' ? parent_uuid : uuid;
        if (role === 'manager') {
            importData.manager_uuid = uuid;
        }
        return this.lead_management.importLeadmanagement(importData);
    }

    @Post("/import/mapper")
    @postDecoraters("Lead management imported successfully", "To import lead management")
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            }),
            limits: {
                fileSize: 10 * 1024 * 1024, // ✅ 10 MB (adjust as needed)
            },
        })
    )


    /*
    @Usage             : To import lead management
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of lead management
    @return Object     : Success / Error
    */

    importLeadmanagementWithMapper(@Body() importData: LeadManagementImportMapperDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        console.log("Dfd", importData);
        const { uuid, role, parent_uuid } = req.user;
        importData.file = file.originalname;
        importData.tenant_uuid = role === 'manager' ? parent_uuid : uuid;
        if (role === 'manager') {
            importData.manager_uuid = uuid;
        }
        return this.lead_management.importLeadmanagement(importData);
    }

    @Patch('leads/batch-update')
    @putDecoraters("Lead status update successfully", "Update single lead status using uuid")

    /*
    @Usage               : Update multiple lead
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Batch updated successfully
    */

    leadBatchUpdate(@Body() leadBatchUpdateDto: LeadBatchUpdateDto, @Req() req) {
        const { uuid, role, parent_uuid } = req.user;
        leadBatchUpdateDto.tenant_uuid = role === 'manager' ? parent_uuid : uuid;
        return this.lead_management.leadBatchUpdate(leadBatchUpdateDto);
    }

    /******* For Agent ***********/

    @Post("/agent")
    @postDecoraters("Lead created successfully", "Create a new lead")

    /*
    @Usage                          : To create new lead for agent
    @Method                         : POST
    @Param first_name               : string
    @Param last_name                : string
    @Param phone_number             : string
    @Param status                   : integer [Default 0]
    @return success / error object  : { Lead created successfully / Lead already exist}
    */

    createAgentLead(@Body() agentLeadManagementDto: AgentLeadManagementDto) {
        return this.lead_management.createAgentLead(agentLeadManagementDto);
    }

    @Put('/agent/:uuid')
    @putDecoraters("Lead update successfully", "Update single lead using uuid")

    /*
    @Usage                          : Update single lead using uuid for agent
    @Method                         : PUT
    @Param first_name               : string
    @Param last_name                : string
    @Param address                  : string
    @Param phone_number             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Lead updated successfully / Lead already exist}
    */

    updateAgentLead(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() agentLeadManagementDto: AgentLeadManagementDto) {
        return this.lead_management.updateAgentLead(id, agentLeadManagementDto);
    }

    @Get("/tenant-leads/list")
    @getDecoraters("Retrieved all leads successfully", "List all leads")

    /*
    @Usage  : To get all leads of tenant
    @Method : GET
    @return : Array of an object with total count of leads with data
    */

    async getLeadsOfTenantForAgent(@Query() queryParam) {
        return this.lead_management.getLeadsOfTenantForAgent(queryParam);
    }

    /******* For Agent Section End ***********/

    @Post("/distribution")
    @postDecoraters("Lead management distribution successfully", "To distribution lead management")
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: "./upload",
                filename: (req, file, cb) => {
                    cb(null, `${file.originalname}`)
                }
            })
        })
    )


    /*
    @Usage             : To distribution lead management
    @Method            : POST
    @Param user_uuid   : string
    @Param file        : csv file of lead management
    @return Object     : Success / Error
    */

    distributionLeadmanagement(@Body() importData: LeadManagementDistributionDto, @UploadedFile('file', new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })]
    })) file, @Req() req) {
        const { uuid, role, parent_uuid } = req.user;
        let newData: any = importData;
        console.log("newdata", newData);
        newData.file = file.originalname;
        newData.tenant_uuid = role === 'manager' ? parent_uuid : uuid;
        if (role === 'manager') {
            newData.manager_uuid = uuid;
        }
        newData.lead_group_uuid = newData.lead_group_uuid;
        console.log(newData, newData.user_uuid);
        newData.user_uuid = newData.user_uuid.split(","); // Split the user UUIDs by comma
        return this.lead_management.distributionLeadmanagement(newData);
    }

    @Get("/leads-with-call-info/:lead_uuid")
    @getDecoraters("Retrieved all leads successfully", "List all leads")

    /*
    @Usage  : List all leads
    @Method : GET
    @return : Array of an object with total count of leads with data
    */

    async fetchLeadWithCallInfoAndNotes(@Query() queryParam, @Param() param) {
        return this.lead_management.fetchLeadWithCallInfoAndNotes(queryParam, param.lead_uuid);
    }

    @Get("/custom-field/:lead_group_uuid")
    @getDecoraters("Retrieved all custom-field successfully", "List all custom-fields")

    /*
    @Usage  : List all custom-fields
    @Method : GET
    @return : Array of an object with total count of custom-fields with data
    */

    async fetchcustomfields(@Query() queryParam, @Param() param) {
        return this.lead_management.fetchcustomfields(queryParam, param.lead_group_uuid);
    }

    @Get("/unallocated-leads/list")
    @getDecoraters("Retrieved all unallocated successfully", "List all unallocated leads")

    /*
    @Usage  : List all custom-fields
    @Method : GET
    @return : Array of an object with total count of custom-fields with data
    */

    async fetchUnallocatedLeads(@Query() queryParam) {
        return this.lead_management.fetchUnallocatedLeads(queryParam);
    }
}


