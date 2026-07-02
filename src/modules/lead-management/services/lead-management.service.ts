import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateLeadManagementDto } from "../dto/create-lead-management.dto";
import { LeadManagementDocument, LeadManagementSchema } from "../schema/lead-management.schema";
import { AgentLeadManagementDto } from "../dto/agent-lead-management";
import { deleteMethod, getMethod } from "src/global_constant";
import { parseStream } from 'fast-csv';
import * as fs from 'fs';
import { OutboundCampaignDialableStatus } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign-dialable-status";
import { OutboundCampaignDialableDocument } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign-dialable-status";
import { BlendedCampaignDialableStatus, BlendedCampaignDialableDocument } from "src/modules/campaigns/blended-campaign/schema/blended-campaign-dialable-status";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "../schema/leads-in-queue.schema";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { LeadBatchUpdateDto } from "../dto/lead-batch-update.dto";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { NotesDocument, NotesSchema } from "src/modules/notes/schema/notes.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { LeadManagementDistributionDto } from "../dto/lead-management-distribution.dto";
import { LeadManagementImportDto } from "../dto/lead-management-import.dto";
import * as moment from 'moment-timezone';
import { OutboundCampaignDocument, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { CreateOutboundCampaignDto } from "src/modules/campaigns/outbound-campaign/dto/create-outbound-campaign.dto";
import { CustomFieldDocument, CustomFieldSchema } from "src/modules/custom-field/schema/custom-field-schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { WhatsappmessageDocument, WhatsappmessageSchema } from "src/modules/whatsapp-message/schema/whatsappmessage.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { OutboundCampaignService } from "src/modules/campaigns/outbound-campaign/services/outbound-campaign.service";
import { BlendedCampaignService } from "src/modules/campaigns/blended-campaign/services/blended-campaign.service";
import { ResetLeadDto } from "src/modules/campaigns/outbound-campaign/dto/reset-lead.dto";

@Injectable()

export class LeadManagementService {

    /*
    @Usage              : To load lead management schema and other libraries
    @Param @InjectModel : It will load lead management schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [lead_management,commonDbFn]
    */

    constructor(
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(OutboundCampaignDialableStatus.name) private readonly outbound_campaign_dialable_status: Model<OutboundCampaignDialableDocument>,
        @InjectModel(BlendedCampaignDialableStatus.name) private readonly blended_campaign_dialable_status: Model<BlendedCampaignDialableDocument>,
        @InjectModel(LeadsInQueueSchema.name) private readonly leads_in_queue: Model<LeadsInQueueDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly lead_group: Model<LeadGroupDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        //@InjectModel( CdrsSchema.name ) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel("cdrs") private readonly cdrs: Model<CdrsDocument>,
        @InjectModel(NotesSchema.name) private readonly notes: Model<NotesDocument>,
        @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        @InjectModel(CustomFieldSchema.name) private readonly custom_fields: Model<CustomFieldDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        @InjectModel(WhatsappmessageSchema.name) private readonly whatsappmessage: Model<WhatsappmessageDocument>,
        @InjectModel(LeadGroupSchema.name) private leadGroupModel: Model<any>,
        @InjectModel(TenantSchema.name) private tenantModel: Model<any>,

        private readonly commonDbFn: CommonDBFunctions,
        private readonly outboundCampaignService: OutboundCampaignService,
        private readonly blendedCampaignService: BlendedCampaignService
    ) { }

    /*
    @Usage                         : To insert a new lead
    @Param createLeadManagementDto : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async create(createLeadManagementDto: CreateLeadManagementDto) {
        const { lead_status, lead_group_uuid, tenant_uuid, phone_number, from, cdrs_uuid, phone_code, role } = createLeadManagementDto;
        createLeadManagementDto.created_flag = "1";
        let where = [{ lead_status }, { lead_group_uuid }, { tenant_uuid }, { phone_number }];

        let logMessages = {
            logErrorMsg: "Lead already exist \n",
            logSuccessMsg: "Lead created successfully \n"
        }
        delete createLeadManagementDto.role;

        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createLeadManagementDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createLeadManagementDto.tenant_uuid = tenantInfo.tenant_uuid;
                createLeadManagementDto.manager_uuid = lookupUuid as string;
            } else {
                // If tenantInfo is not found, it means tenant_uuid might already be the real tenant_uuid
                createLeadManagementDto.manager_uuid = createLeadManagementDto.manager_uuid || "";
            }
        }

        //Get campaign based on lead_group_uuid
        let result = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
        createLeadManagementDto.campaign_uuid = result?.campaign_uuid;
        createLeadManagementDto.campaign_flag = result?.campaign_flag;
        const campaign_uuid = result?.campaign_uuid;
        const campaign_flag = result?.campaign_flag;
        createLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);

        let response = await this.commonDbFn.findAndInsert(this.lead_management, where, createLeadManagementDto, JSON.stringify(logMessages), "and", true);

        if (campaign_flag == 'blended') {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, campaign_uuid)
        } else {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, campaign_uuid)
        }
        await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, lead_group_uuid);

        if (response.statusCode == 409) { return response; }
        this.checkLeadExistInDailableStatus(lead_status, lead_group_uuid, tenant_uuid, where, createLeadManagementDto, response.message.lead_management_uuid, result?.campaign_uuid);

        //Bind created lead with cdrs and notes
        if (from != "" && from == "cdrs") {
            this.bindLeadWithCdrsAndNotes(cdrs_uuid, response.message.lead_management_uuid);
        }

        delete response.message;
        return response;
    }

    /*
    @Usage                         : To insert a new lead
    @Param createLeadManagementDto : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async createNewLead(createLeadManagementDto: CreateLeadManagementDto) {
        // const { lead_status, lead_group_uuid, tenant_uuid, phone_number, from, cdrs_uuid, phone_code, role, DebtorAccount, Employee, MiddleName, SSN, ClientName, Balance, AmountPlaced, AmountPaid, HomePhone, NumberMultiples, ScheduleDate, DialerList } = createLeadManagementDto;
        const { lead_status, lead_group_uuid, tenant_uuid, phone_number, from, cdrs_uuid, phone_code, role } = createLeadManagementDto;
        createLeadManagementDto.created_flag = "1";

        // Set default lead_status to "NEW" if not provided
        if (!lead_status) {
            const new_lead_status = await this.disposition.findOne(
                { code: "NEW" },
                { disposition_uuid: 1, _id: 0 }
            ).exec();
            createLeadManagementDto.lead_status = new_lead_status?.disposition_uuid as string;
        }

        // createLeadManagementDto.custom_fields = {
        //     "DebtorAccount": custom_fields?.DebtorAccount,
        //     "Employee": Employee,
        //     "MiddleName": MiddleName,
        //     "SSN": SSN,
        //     "ClientName": ClientName,
        //     "Balance": Balance,
        //     "AmountPlaced": AmountPlaced,
        //     "AmountPaid": AmountPaid,
        //     "HomePhone": HomePhone,
        //     "NumberMultiples": NumberMultiples,
        //     "ScheduleDate": ScheduleDate,
        //     "DialerList": DialerList
        // }

        let where = [{ lead_status }, { lead_group_uuid }, { tenant_uuid }, { phone_number }];

        let logMessages = {
            logErrorMsg: "Lead already exist \n",
            logSuccessMsg: "Lead created successfully \n"
        }
        delete createLeadManagementDto.role;

        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createLeadManagementDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createLeadManagementDto.tenant_uuid = tenantInfo.tenant_uuid;
                createLeadManagementDto.manager_uuid = lookupUuid as string;
            } else {
                // If tenantInfo is not found, it means tenant_uuid might already be the real tenant_uuid
                createLeadManagementDto.manager_uuid = createLeadManagementDto.manager_uuid || "";
            }
        }

        //Get campaign based on lead_group_uuid
        let result = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
        createLeadManagementDto.campaign_uuid = result?.campaign_uuid;
        createLeadManagementDto.campaign_flag = result?.campaign_flag;
        const campaign_uuid = result?.campaign_uuid;
        const campaign_flag = result?.campaign_flag;
        createLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);

        let isVyapar = false;
        let actual_tenant_uuid = createLeadManagementDto.tenant_uuid || tenant_uuid;
        if (actual_tenant_uuid) {
            const tenantInfo = await this.tenantModel.findOne({ uuid: actual_tenant_uuid }, { company_code: 1 }).exec();
            if (tenantInfo?.company_code?.toLowerCase() === 'vyapar') {
                isVyapar = true;
            }
        }

        let response;
        if (isVyapar) {
            response = await this.commonDbFn.insert(this.lead_management, createLeadManagementDto, JSON.stringify(logMessages), true);
        } else {
            response = await this.commonDbFn.findAndInsert(this.lead_management, where, createLeadManagementDto, JSON.stringify(logMessages), "and", true);
        }

        if (campaign_flag == 'blended') {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, campaign_uuid)
        } else {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, campaign_uuid)
        }
        await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, lead_group_uuid);

        if (response.statusCode == 409) { return response; }
        this.checkLeadExistInDailableStatus(lead_status, lead_group_uuid, tenant_uuid, where, createLeadManagementDto, response.message.lead_management_uuid, result?.campaign_uuid);

        //Bind created lead with cdrs and notes
        if (from != "" && from == "cdrs") {
            this.bindLeadWithCdrsAndNotes(cdrs_uuid, response.message.lead_management_uuid);
        }

        // Call resetLeads after successful lead creation
        if (campaign_uuid && lead_group_uuid && tenant_uuid) {
            const resetLeadDto: ResetLeadDto = {
                lead_group_uuid: lead_group_uuid as string,
                campaign_uuid: campaign_uuid as string,
                tenant_uuid: tenant_uuid as string
            };
            try {
                // Use appropriate service based on campaign_flag
                if (campaign_flag === 'blended') {
                    await this.blendedCampaignService.resetLeads(resetLeadDto);
                } else {
                    await this.outboundCampaignService.resetLeads(resetLeadDto);
                }
                Logger.debug(`Reset leads called successfully for campaign: ${campaign_uuid}`);
            } catch (error) {
                Logger.error(`Error calling resetLeads: ${error.message}`);
            }
        }

        if (createLeadManagementDto.webhook === true) {
            return { statusCode: response?.statusCode, message: response?.data, lead_uuid: response?.message?.lead_management_uuid }
        } else {
            delete response.message;
            return response;
        }
    }

    /** Use this for bulk inserts — caller is responsible for counts + reset */
    async createNewLeadWithoutReset(createLeadManagementDto: CreateLeadManagementDto) {
        const { lead_status, lead_group_uuid, tenant_uuid, phone_number, phone_code } = createLeadManagementDto;
        createLeadManagementDto.created_flag = "1";

        if (!lead_status) {
            const new_lead_status = await this.disposition.findOne({ code: { $in: ["AN"] } }, { disposition_uuid: 1, _id: 0 }).exec();
            createLeadManagementDto.lead_status = new_lead_status?.disposition_uuid as string;
        }

        let where = [{ lead_status }, { lead_group_uuid }, { tenant_uuid }, { phone_number }];
        let logMessages = { logErrorMsg: "Lead already exist \n", logSuccessMsg: "Lead created successfully \n" };

        delete createLeadManagementDto.role;

        //Get campaign based on lead_group_uuid
        let result = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();

        createLeadManagementDto.campaign_uuid = result?.campaign_uuid;
        createLeadManagementDto.campaign_flag = result?.campaign_flag;
        createLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);

        // ✅ Insert only — no leads_count_update, no leadgroup_count_update, no resetLeads
        let response = await this.commonDbFn.findAndInsert(this.lead_management, where, createLeadManagementDto, JSON.stringify(logMessages), "and", true);

        return response;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of leads with data
    */

    async findAll(queryParams) {
        let searchFields = ["first_name", "last_name", "address", "custom_phone_number"];
        let populateFields = [{ path: "country", select: 'country nicename -_id -uuid' }, { path: "user", select: 'username fullname -_id -uuid' }, { path: "disposition", select: 'name -_id -disposition_uuid' }, { path: "disposition_1", select: 'name -_id -disposition_uuid' }, { path: "disposition_2", select: 'name -_id -disposition_uuid' }, { path: "lead_group", select: 'name -_id -uuid' }, { path: "campaign_details", select: 'name -_id -uuid' }, { path: "pbx_lead_status", select: 'name -_id -pbx_lead_status_uuid' }, { path: "cdrs_details", select: 'billsecond createdAt -_id', options: { sort: { createdAt: -1 }, limit: 1 } }];
        console.log("queryParams leads", queryParams);

        queryParams.tableName = 'lead_management_unique'
        // Include createdAt and updatedAt in the response
        queryParams.includeTimestamps = true;

        return this.commonDbFn.findAllWithPagination(this.lead_management, queryParams, searchFields, populateFields);
    }

    /*
    @Usage          : To get single lead record based on uuid
    @Param uuid     : Search lead by uuid
    @return Object  : Result of lead
    */

    async findOne(lead_management_uuid: string) {
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead success fetched by uuid : ${lead_management_uuid} \n`
        }
        const leads = await this.lead_management.findOne({ lead_management_uuid }).populate('disposition', 'name -_id -disposition_uuid').exec();
        console.log("single lead fetched successfully.....", leads)
        if (leads == null) {
            Logger.error(`Lead not found by uuid : ${lead_management_uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Lead not found" })
        }
        Logger.debug(`Lead success fetched by uuid : ${lead_management_uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, leads);
        //return this.commonDbFn.findOne(this.lead_management, lead_management_uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                         : To update lead
    @Param uuid                    : Update lead by uuid
    @Param createLeadManagementDto : Request parameters for update
    @return Object                 : Success / Error
    */

    async update(lead_management_uuid: string, createLeadManagementDto: CreateLeadManagementDto) {
        const { phone_code, phone_number, lead_group_uuid, tenant_uuid, lead_status } = createLeadManagementDto;
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead updated successfully by uuid : ${lead_management_uuid} \n`
        }

        //Get campaign based on lead_group_uuid
        let response = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
        createLeadManagementDto.campaign_uuid = response?.campaign_uuid;
        createLeadManagementDto.campaign_flag = response?.campaign_flag;
        //Check lead status is changed or not
        let dncDispositionUUID;
        try {
            dncDispositionUUID = await this.disposition.findOne({ code: "DNC" }, { disposition_uuid: 1 }).exec();
            dncDispositionUUID = dncDispositionUUID.disposition_uuid;
            if (lead_status != dncDispositionUUID) {
                createLeadManagementDto.in_dnc = "1";
            }
        } catch (error) {
            Logger.error(`Unable to find uuid of DNC`, error.message);
        }
        createLeadManagementDto.created_flag = "1";
        createLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);
        const result = await this.lead_management.updateOne({ lead_management_uuid }, createLeadManagementDto).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        await this.commonDbFn.leads_in_queue_delete(this.leads_in_queue, lead_management_uuid, createLeadManagementDto.campaign_uuid);
        Logger.debug(res.logSuccessMsg);
        await this.commonDbFn.leads_update_count_update(this.lead_group, this.lead_management, tenant_uuid);
        if (createLeadManagementDto.campaign_flag == 'blended') {
            let campaign_data = await this.blended_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, data.uuid);
                }
            })
        } else {
            let campaign_data = await this.outbound_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, data.uuid);
                }
            })
        }
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
        //return this.commonDbFn.update(this.lead_management, lead_management_uuid, createLeadManagementDto, JSON.stringify(logMessages));
    }

    /*
      @Usage                         : To update lead
      @Param uuid                    : Update lead by uuid
      @Param createLeadManagementDto : Request parameters for update
      @return Object                 : Success / Error
      */

    async updateNewLead(lead_management_uuid: string, createLeadManagementDto: CreateLeadManagementDto) {
        const { lead_status, lead_group_uuid, tenant_uuid, phone_number, phone_code } = createLeadManagementDto;
        // const { lead_status, lead_group_uuid, tenant_uuid, phone_number, phone_code, DebtorAccount, Employee, MiddleName, SSN, ClientName, Balance, AmountPlaced, AmountPaid, HomePhone, NumberMultiples, ScheduleDate, DialerList } = createLeadManagementDto;
        // createLeadManagementDto.custom_fields = {
        //     "DebtorAccount": DebtorAccount,
        //     "Employee": Employee,
        //     "MiddleName": MiddleName,
        //     "SSN": SSN,
        //     "ClientName": ClientName,
        //     "Balance": Balance,
        //     "AmountPlaced": AmountPlaced,
        //     "AmountPaid": AmountPaid,
        //     "HomePhone": HomePhone,
        //     "NumberMultiples": NumberMultiples,
        //     "ScheduleDate": ScheduleDate,
        //     "DialerList": DialerList
        // }
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead updated successfully by uuid : ${lead_management_uuid} \n`
        }

        //Get campaign based on lead_group_uuid
        let response = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
        createLeadManagementDto.campaign_uuid = response?.campaign_uuid;
        createLeadManagementDto.campaign_flag = response?.campaign_flag;
        //Check lead status is changed or not
        let dncDispositionUUID;
        try {
            dncDispositionUUID = await this.disposition.findOne({ code: "DNC" }, { disposition_uuid: 1 }).exec();
            dncDispositionUUID = dncDispositionUUID.disposition_uuid;
            if (lead_status != dncDispositionUUID) {
                createLeadManagementDto.in_dnc = "1";
            }
        } catch (error) {
            Logger.error(`Unable to find uuid of DNC`, error.message);
        }
        createLeadManagementDto.created_flag = "1";
        createLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);
        const result = await this.lead_management.updateOne({ lead_management_uuid }, createLeadManagementDto).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        await this.commonDbFn.leads_in_queue_delete(this.leads_in_queue, lead_management_uuid, createLeadManagementDto.campaign_uuid);
        Logger.debug(res.logSuccessMsg);
        await this.commonDbFn.leads_update_count_update(this.lead_group, this.lead_management, tenant_uuid);
        if (createLeadManagementDto.campaign_flag == 'blended') {
            let campaign_data = await this.blended_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, data.uuid);
                }
            })
        } else {
            let campaign_data = await this.outbound_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, data.uuid);
                }
            })
        }
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();

        // Call resetLeads after successful lead update
        const campaign_uuid = response?.campaign_uuid;
        const campaign_flag = response?.campaign_flag;
        if (campaign_uuid && lead_group_uuid && tenant_uuid) {
            const resetLeadDto: ResetLeadDto = {
                lead_group_uuid: lead_group_uuid as string,
                campaign_uuid: campaign_uuid as string,
                tenant_uuid: tenant_uuid as string
            };
            try {
                // Use appropriate service based on campaign_flag
                if (campaign_flag === 'blended') {
                    await this.blendedCampaignService.resetLeads(resetLeadDto);
                } else {
                    await this.outboundCampaignService.resetLeads(resetLeadDto);
                }
                Logger.debug(`Reset leads called successfully for campaign: ${campaign_uuid}`);
            } catch (error) {
                Logger.error(`Error calling resetLeads: ${error.message}`);
            }
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
        //return this.commonDbFn.update(this.lead_management, lead_management_uuid, createLeadManagementDto, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search lead using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of lead with data
    */

    //async advancedSearch(searchParams) {
    /*let populateFields = [{ path: "country", select: 'country nicename -_id -uuid' },{ path: "user", select: 'username -_id -uuid' },{ path: "disposition", select: 'name -_id -disposition_uuid' },{ path: "lead_group", select: 'name -_id -uuid' },{ path: "campaign_details", select: 'name -_id -uuid' }];
        return this.commonDbFn.advancedSearch(this.lead_management, searchParams,populateFields);*/


    async advancedSearch(searchParams) {

        let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;

        //Check Role type
        let { role, tenant_uuid, uuid } = searchParams;
        if (role == "tenant" || role == "manager") {
            where.push({ tenant_uuid: tenant_uuid });
        } else if (role == "agent") {
            where.push({ user_uuid: uuid });
        }

        // Handle date range filter
        const { date_filter_type, start_date, end_date } = searchParams;
        if (start_date && end_date) {
            const dateField = date_filter_type || 'createdAt'; // Default to createdAt
            where.push({
                [dateField]: {
                    $gte: new Date(start_date),
                    $lte: new Date(end_date)
                }
            });
        }

        //Delete unnecessary details from request
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;
        delete searchParams.date_filter_type;
        delete searchParams.start_date;
        delete searchParams.end_date;
        let populateFields = [{ path: "country", select: 'country nicename -_id -uuid' }, { path: "user", select: 'username fullname -_id -uuid' }, { path: "disposition", select: 'name -_id -disposition_uuid' }, { path: "disposition_1", select: 'name -_id -disposition_uuid' }, { path: "disposition_2", select: 'name -_id -disposition_uuid' }, { path: "lead_group", select: 'name -_id -uuid' }, { path: "campaign_details", select: 'name -_id -uuid' }, { path: "pbx_lead_status", select: 'name -_id -pbx_lead_status_uuid' }, { path: "cdrs_details", select: 'billsecond createdAt -_id', options: { sort: { createdAt: -1 }, limit: 1 } }];

        //Pagination
        const perPage = Number(searchParams.limit) || 10;
        const currentPage = Number(searchParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        //End


        objectKeys = Object.keys(searchParams);
        objectValues = Object.values(searchParams);
        len = objectKeys.length;

        for (i = 0; i < len; i++) {
            filedName = objectKeys[i];
            filedValue = objectValues[i];
            if (filedName.includes("|")) {
                key = filedName.split("|")[0].trim();
                searchFlag = parseInt(filedName.split("|")[1].trim());
            } else {
                key = filedName;
                searchFlag = -1;
            }

            switch (searchFlag) {
                case 1: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
                case 2: // Contains
                    obj = { [key]: { $regex: filedValue, $options: "i" } };
                    where.push(obj);
                    break;
                case 3: // Does not contains
                    obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    where.push(obj);
                    break;
                case 4: // Is equal to
                    switch (key) {
                        case "lead_status":
                            obj = {
                                $or: [
                                    { lead_status: filedValue },
                                    { lead_status_1: filedValue },
                                    { lead_status_2: filedValue }
                                ]
                            };
                            where.push(obj)
                            break;
                        case "lead_status_1":
                            obj = {
                                $or: [
                                    { lead_status_1: filedValue },
                                    { lead_status: filedValue }
                                ]
                            };
                            where.push(obj)
                            break;
                        case "lead_status_2":
                            obj = {
                                $or: [
                                    { lead_status_1: filedValue },
                                    { lead_status: filedValue }
                                ]
                            };
                            where.push(obj)
                            break;
                        default:
                            obj = { [key]: filedValue };
                            where.push(obj);
                            break;
                    }
                    break;
                case 5: // In not equal to
                    obj = { [key]: { $ne: filedValue } };
                    where.push(obj);
                    break;
                case 6: //Ends with
                    obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    where.push(obj);
                    break;

                default: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
            }
        }

        if (where.length == 0) {
            where = {};
        }
        result = await this.lead_management.find({ $and: where }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).exec();
        result?.map((data) => {
            if (data.cdrs_details != '' && data.cdrs_details != undefined) {
                if (data.cdrs_details[0].createdAt != undefined) {
                    data.cdrs_details[0].converted_date = moment.tz(data.cdrs_details[0].createdAt, searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");
                }
            }
            data.converted_date = moment.tz(data.createdAt, searchParams.timezone).format("YYYY-MM-DD HH:mm:ss");


        })
        if (result.length > 0) {
            count = await this.lead_management.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
        }
    }
    // }

    /*
    @Usage         : To update status of Lead[Active/Inactive]
    @Param uuid    : uuid of lead
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch(lead_management_uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead status updated successfully by uuid : ${lead_management_uuid} \n`
        }
        const result = await this.lead_management.updateOne({ lead_management_uuid }, body).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
        //return this.commonDbFn.update(this.lead_management, lead_management_uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple lead using uuid
    @Param uuid    : To delete single lead pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove(lead_management_uuid: string) {
        let uuids = lead_management_uuid.split(",");

        const deletedLeads = await this.lead_management.find({ lead_management_uuid: { $in: uuids } }).select('lead_group_uuid').exec();
        // console.log( 'adesh this is delete lead' )
        // console.log( deletedLeads );
        const uniqueLeadGroupUUIDs = [...new Set(deletedLeads.map(lead => lead.lead_group_uuid))];
        const result = await this.lead_management.deleteMany({ lead_management_uuid: { $in: uuids } }).exec();
        let deletedCount = { totalRecordDeleted: result.deletedCount }
        if (result.deletedCount == 0) {
            Logger.error(`Lead not exist by uuid : ${lead_management_uuid} \n`, deleteMethod);
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Lead not exist", deletedCount);
        }

        for (const leadgroupuuid of uniqueLeadGroupUUIDs) {
            const lead_group_data = await this.lead_group.findOne({ uuid: leadgroupuuid }).select('campaign_uuid campaign_flag').exec();
            // console.log( lead_group_data );

            // Skip if lead group not found
            if (!lead_group_data) {
                Logger.warn(`Lead group not found for uuid: ${leadgroupuuid}`);
                continue;
            }
            await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, leadgroupuuid)
            if (lead_group_data.campaign_flag === 'blended') {
                await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, leadgroupuuid, lead_group_data.campaign_uuid);
                await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, lead_group_data.campaign_uuid);
            } else {
                await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, leadgroupuuid, lead_group_data.campaign_uuid);
                await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, lead_group_data.campaign_uuid);
            }
        }
        Logger.debug(`Lead deleted successfully by uuid : ${lead_management_uuid} \n`);
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, "Lead deleted successfully", deletedCount);
    }

    /*
    @Usage                 : To add received object from addCsvData() function into DB
    @Param postData        : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    async importLeadmanagement(postData: LeadManagementImportDto) {
        let { file, filter_by, lead_group_uuid, tenant_uuid } = postData;
        let allLeads: any = await this.addCsvData(postData);
        allLeads.shift();

        /*let result;
            let filterName = filter_by == "0" ? "Lead group" : "Tenant";
            Logger.warn(`Importing leads .... , Filter applied by : ${filterName}`);
            if (filter_by == "0") { // Filter by lead group
                result = await this.lead_management.find({ lead_group_uuid }, { phone_number: 1, _id: 0 }).exec();
            } else { // Filter by Tenant
                result = await this.lead_management.find({ tenant_uuid }, { phone_number: 1, _id: 0 }).exec();
            }
            let matched, leadArr = [];
            allLeads.map((data) => {
                matched = result.filter(function (el) {
                    return el.phone_number == data.phone_number;
                });
                if (matched.length == 0) {
                    leadArr.push(data);
                }
            });

            let insertedRecords = 0, recordText;
            try {
                await this.lead_management.insertMany(leadArr, { ordered: false });
                insertedRecords = leadArr.length;
            } catch (error) {
                insertedRecords = error.result.nInserted;
            }*/

        //Variable declaration
        let result, leadArr, insertedRecords = 0, recordText, len;

        switch (filter_by) {

            case "0": // Filter by lead group
                Logger.warn(`Importing leads .... , Filter applied by : Lead Group`);
                result = await this.lead_management.find({ lead_group_uuid }, { phone_number: 1, _id: 0 })
                    .exec();
                console.log("R", result, result.length);
                leadArr = this.filterData(allLeads, result);
                break;

            case "1": // Filter by Tenant
                Logger.warn(`Importing leads .... , Filter applied by : Tenant`);
                result = await this.lead_management.find({ tenant_uuid }, { phone_number: 1, _id: 0 })
                    .exec();
                leadArr = this.filterData(allLeads, result);
                break;

            case "2": // Filter by CSV [Remove duplicate by custom_phone_number]
                Logger.warn(`Importing leads .... , Filter applied by : CSV`);
                const leadData = allLeads.map(({ custom_phone_number }) => custom_phone_number);
                const filtered = allLeads.filter(({ custom_phone_number }, index) =>
                    !leadData.includes(custom_phone_number, index + 1));
                leadArr = filtered;
                break;

            case "3": // No duplicate check
                Logger.warn(`Importing leads .... , Filter applied by : No duplicate check`);
                leadArr = allLeads;
                break;
        }

        try {
            insertedRecords = leadArr != undefined ? leadArr.length : 0;
            if (insertedRecords != 0) {
                await this.lead_management.insertMany(leadArr, { ordered: false });
            }
        } catch (error) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        // fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
        //     Logger.debug(`${file} file deleted`);
        // });
        len = allLeads?.length == 0 ? 0 : allLeads.length;
        let campaign_data = await this.lead_group.find({ uuid: lead_group_uuid }).select('campaign_uuid campaign_flag').exec();
        // console.log( 'adesh_lead import' );
        // console.log( campaign_data );
        let campaign_uuid = campaign_data[0]['campaign_uuid'];
        let campaign_flag = campaign_data[0]['campaign_flag'];
        await this.commonDbFn.leadgroup_count_update(this.lead_group, this.lead_management, lead_group_uuid)
        if (campaign_flag == 'blended') {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, campaign_uuid);
        } else {
            await this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, campaign_uuid);
        }

        // Call resetLeads after successful lead import
        if (campaign_uuid && lead_group_uuid && tenant_uuid) {
            const resetLeadDto: ResetLeadDto = {
                lead_group_uuid: lead_group_uuid as string,
                campaign_uuid: campaign_uuid as string,
                tenant_uuid: tenant_uuid as string
            };
            try {
                // Use appropriate service based on campaign_flag
                if (campaign_flag === 'blended') {
                    await this.blendedCampaignService.resetLeads(resetLeadDto);
                } else {
                    await this.outboundCampaignService.resetLeads(resetLeadDto);
                }
                Logger.debug(`Reset leads called successfully for campaign: ${campaign_uuid} after import`);
            } catch (error) {
                Logger.error(`Error calling resetLeads after import: ${error.message}`);
            }
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}`);
    }

    /*
    @Usage                 : To create object with csv data
    @Param postData        : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    async addCsvData(postData) {
        let { file, tenant_uuid, lead_group_uuid, mapper_keys, custom_fields, phone_code, manager_uuid } = postData;

        //Get campaign and extract wrap_up_disposition for dynamic lead status
        let disposition_uuid, campaignUUID, campaignDetails;
        try {
            // Fetch lead group to get campaign UUID
            campaignUUID = await this.lead_group.findOne(
                { uuid: lead_group_uuid },
                { campaign_uuid: 1, campaign_flag: 1, _id: 0 }
            ).exec();

            // Try to fetch disposition from dialable_status collections
            if (campaignUUID?.campaign_uuid) {
                // Try outbound campaign dialable status first
                campaignDetails = await this.outbound_campaign_dialable_status.findOne(
                    { outbound_campaign_uuid: campaignUUID.campaign_uuid },
                    { disposition_uuid: 1, _id: 0 }
                ).exec();

                // If not found in outbound, try blended campaign dialable status
                if (!campaignDetails) {
                    campaignDetails = await this.blended_campaign_dialable_status.findOne(
                        { blended_campaign_uuid: campaignUUID.campaign_uuid },
                        { disposition_uuid: 1, _id: 0 }
                    ).exec();
                }
            }

            // Use disposition_uuid if available, otherwise fall back to "NEW"
            if (campaignDetails?.disposition_uuid) {
                disposition_uuid = { disposition_uuid: campaignDetails.disposition_uuid };
                Logger.debug(`Using campaign dialable status disposition: ${campaignDetails.disposition_uuid}`);
            } else {
                // Fallback to "NEW" status
                disposition_uuid = await this.disposition.findOne(
                    { code: "NEW" },
                    { disposition_uuid: 1, _id: 0 }
                ).exec();
                Logger.warn(`No wrap_up_disposition found for campaign, falling back to NEW status`);
            }
        } catch (error) {
            Logger.error("Unable to fetch campaign disposition", error.message);
            // Fallback to "NEW" on error
            try {
                disposition_uuid = await this.disposition.findOne(
                    { code: "NEW" },
                    { disposition_uuid: 1, _id: 0 }
                ).exec();
            } catch (fallbackError) {
                Logger.error("Unable to fetch NEW disposition as fallback", fallbackError.message);
            }
        }

        //For lead import mapper
        if (mapper_keys != undefined) {
            mapper_keys = JSON.parse(mapper_keys);
        }

        let keyValueArray = [];
        if (custom_fields != undefined) {
            custom_fields = JSON.parse(custom_fields);
            keyValueArray = Object.entries(custom_fields);
            // const customFieldKeys = Object.keys(custom_fields).map(key => ({ [key]: custom_fields[key] }));
        }

        let allLeads = [];
        let obj: any = {};
        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(`./upload/${file}`);
            // const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
            parseStream(stream)
                .on('error', error => console.error(error))
                .on('data', row => {
                    // Create the custom fields object
                    let customFieldObj = {};
                    if (keyValueArray.length > 0) {
                        keyValueArray.forEach(([key, value]) => {
                            let rowValue = row[custom_fields?.[value] == undefined ? value : custom_fields[value]];

                            // Check if the rowValue is a string and contains a comma
                            if (typeof rowValue === 'string' && rowValue.includes(',')) {
                                // Split the string into an array
                                rowValue = rowValue.split(',').map(item => item.trim());
                            }

                            customFieldObj[key] = rowValue;
                            console.log(`Key: ${key}, Value: ${rowValue}`);
                        });
                    }
                    obj = {
                        lead_group_uuid,
                        tenant_uuid,
                        user_uuid: "",
                        first_name: row[mapper_keys?.first_name == undefined ? "0" : mapper_keys.first_name],
                        last_name: row[mapper_keys?.last_name == undefined ? "1" : mapper_keys.last_name],
                        address: row[mapper_keys?.address == undefined ? "2" : mapper_keys.address],
                        city: row[mapper_keys?.city == undefined ? "3" : mapper_keys.city],
                        state: row[mapper_keys?.state == undefined ? "4" : mapper_keys.state],
                        province: row[mapper_keys?.province == undefined ? "5" : mapper_keys.province],
                        postal_code: row[mapper_keys?.postal_code == undefined ? "6" : mapper_keys.postal_code],
                        dob: row[mapper_keys?.dob == undefined ? "7" : mapper_keys.dob],
                        // phone_code: row[mapper_keys?.phone_code == undefined ? "8" : mapper_keys.phone_code],
                        phone_code: phone_code,
                        phone_number: row[mapper_keys?.phone_number == undefined ? "8" : mapper_keys.phone_number],
                        alternate_phone_number: row[mapper_keys?.alternate_phone_number == undefined ? "9" : mapper_keys.alternate_phone_number],
                        email: row[mapper_keys?.email == undefined ? "10" : mapper_keys.email],
                        //lead_status: row[mapper_keys?.lead_status == undefined ? "12" : mapper_keys.lead_status],
                        lead_status: disposition_uuid?.disposition_uuid,
                        gender: row[mapper_keys?.gender == undefined ? "12" : mapper_keys.gender],
                        description: row[mapper_keys?.description == undefined ? "13" : mapper_keys.description],
                        //status: row[mapper_keys?.status == undefined ? "14" : mapper_keys.status],
                        created_flag: "1",
                        campaign_uuid: campaignUUID?.campaign_uuid,
                        campaign_flag: campaignUUID?.campaign_flag,
                        custom_phone_number: phone_code.concat(row[mapper_keys?.phone_number == undefined ? "9" : mapper_keys.phone_number]),
                        custom_fields: customFieldObj,
                        manager_uuid: manager_uuid
                    }
                    allLeads.push(obj);
                })
                .on('end', async (rowCount: number) => {
                    resolve(allLeads);
                });
        });
    }

    /******* Agent section ***********/

    /*
    @Usage                         : To insert a new lead for agent
    @Param agentLeadManagementDto  : Request paramter that we set into dto
    @return Object                 : Success / Error
    */

    async createAgentLead(agentLeadManagementDto: AgentLeadManagementDto) {
        const { lead_status, lead_group_uuid, tenant_uuid, phone_number, from, cdrs_uuid, uuid, phone_code } = agentLeadManagementDto;
        let where = [{ lead_status }, { lead_group_uuid }, { tenant_uuid }, { phone_number }];
        agentLeadManagementDto.created_flag = "2";
        let logMessages = {
            logErrorMsg: "Lead already exist \n",
            logSuccessMsg: "Lead created successfully \n"
        }
        delete agentLeadManagementDto.role;
        agentLeadManagementDto.user_uuid = uuid;
        agentLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);

        let response = await this.commonDbFn.findAndInsert(this.lead_management, where, agentLeadManagementDto, JSON.stringify(logMessages), "and", true);
        if (response.statusCode == 409) { return response; }
        //Bind created lead with cdrs and notes
        if (from != "" && from == "cdrs") {
            this.bindLeadWithCdrsAndNotes(cdrs_uuid, response.message.lead_management_uuid);
        }
        delete response.message;
        return response;
        //return this.commonDbFn.insert(this.lead_management, agentLeadManagementDto, JSON.stringify(logMessages));
    }

    /*
    @Usage                         : To update lead for agent
    @Param uuid                    : Update lead by uuid
    @Param createLeadManagementDto : Request parameters for update
    @return Object                 : Success / Error
    */

    async updateAgentLead(lead_management_uuid: string, agentLeadManagementDto: AgentLeadManagementDto) {
        const { uuid, phone_code, phone_number } = agentLeadManagementDto;
        let logMessages = {
            logErrorMsg: `Lead not found by uuid : ${lead_management_uuid} \n`,
            logSuccessMsg: `Lead updated successfully by uuid : ${lead_management_uuid} \n`
        }
        agentLeadManagementDto.created_flag = "2";
        agentLeadManagementDto.custom_phone_number = phone_code.concat(phone_number);
        //agentLeadManagementDto.user_uuid = uuid;

        const result = await this.lead_management.updateOne({ lead_management_uuid }, agentLeadManagementDto).exec();
        const res = logMessages;
        if (result.matchedCount == 0 && result.modifiedCount == 0) {
            Logger.error(res.logErrorMsg, deleteMethod);
            res.logErrorMsg = res.logErrorMsg.split("by")[0].trim();
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, res.logErrorMsg);
        }
        await this.whatsappmessage.updateMany({ lead_management_uuid }, { name: agentLeadManagementDto.first_name + " " + agentLeadManagementDto.last_name })
        Logger.debug(res.logSuccessMsg);
        res.logSuccessMsg = res.logSuccessMsg.split("by")[0].trim();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, res.logSuccessMsg);
        //return this.commonDbFn.update(this.lead_management, lead_management_uuid, agentLeadManagementDto, JSON.stringify(logMessages));
    }

    /*
    @Usage                 : To get all leads of tenant
    @Param queryParams     : Request params
    @return                : Array of an object with total count of leads with data
    */

    async getLeadsOfTenantForAgent(queryParams) {
        const { tenant_uuid } = queryParams;
        let searchParams = [], query: any = {};
        let searchFields = ["first_name", "last_name", "address", "phone_number", "custom_phone_number"];

        try {
            //Check search parameters
            if (queryParams.search != "" && queryParams.search != undefined) {
                searchFields.map((data) => {
                    searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } })
                })
                query = { '$or': searchParams };
            }

            let result = await this.lead_management.find({ $and: [query, { tenant_uuid }] }).limit(10).exec();
            let statusCode = result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage(statusCode, result);

        } catch (error) {
            Logger.error(`Unable to fetch tenant leads`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Unable to fetch leads");
        }
    }

    /******* Agent section End ***********/

    /*
    @Usage                         : Check lead status exist in collection outbound_campaign_dialable_status
    @Params                        : lead_status, lead_group_uuid, tenant_uuid, where, createLeadManagementDto,lead_management_uuid
    @return Object                 : Success / Error
    */

    async checkLeadExistInDailableStatus(lead_status, lead_group_uuid, tenant_uuid, where, createLeadManagementDto, lead_management_uuid, campaign_uuid) {
        if (lead_status != "" && lead_group_uuid != "") {
            try {
                let findDispositionExist = await this.outbound_campaign_dialable_status.find({ $and: [{ $or: [{ tenant_uuid }] }, { $or: [{ disposition_uuid: lead_status }, { outbound_campaign_disposition_uuid: lead_status }] }] }).count().exec();

                //If we get greater than 0 then we will add same lead into leads_in_queue collection.
                if (findDispositionExist > 0) {
                    let logMessages = {
                        logErrorMsg: "Lead already exist in queue \n",
                        logSuccessMsg: "Lead created in queue collection successfully \n"
                    }
                    //Get campaign based on lead_group_uuid
                    //let result = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, _id: 0 }).exec();
                    //createLeadManagementDto.campaign_uuid = result.campaign_uuid;
                    createLeadManagementDto.lead_management_uuid = lead_management_uuid;
                    let where = [{ campaign_uuid }, { tenant_uuid }, { lead_management_uuid }];
                    if (createLeadManagementDto.campaign_flag == 'blended') {
                        await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, campaign_uuid);
                    } else {
                        await this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, campaign_uuid);
                    }
                }
            } catch (err) {
                console.log("Error in creating lead", err.message);
            }
        }
    }

    async distributionLeadmanagement(postData: LeadManagementDistributionDto) {
        let { file, user_uuid, filter_by, lead_group_uuid, tenant_uuid } = postData;
        let usersData: any = await this.getUsername(user_uuid);
        let allLeads: any = await this.addCsvDatadis(postData);
        allLeads.shift();

        /* To check duplicate before importing - Manish 06-sep-23 */
        /*let result;
        let filterName = filter_by == "0" ? "Lead group" : "Tenant";
        Logger.warn(`Importing distribution leads .... , Filter applied by : ${filterName}`);
        if (filter_by == "0") { // Filter by lead group
            result = await this.lead_management.find({ lead_group_uuid }, { phone_number: 1, _id: 0 }).exec();
        } else { // Filter by Tenant
            result = await this.lead_management.find({ tenant_uuid }, { phone_number: 1, _id: 0 }).exec();
        }
        let matched, leadArr = [];
        allLeads.map((data) => {
            matched = result.filter(function (el) {
                return el.phone_number == data.phone_number;
            });
            if (matched.length == 0) {
                leadArr.push(data);
            }
        })

    const totalCount = leadArr.length; // Total count of CSV data
        let insertedRecords = 0, recordText;
        try {
            const output1 = await this.assignUserUuid(leadArr, user_uuid);
            await this.lead_management.insertMany(leadArr, { ordered: false });
            insertedRecords = leadArr.length;
        } catch (error) {
            insertedRecords = error.result.nInserted;
        }*/

        //Variable declaration
        let result, leadArr, insertedRecords = 0, recordText, len;

        switch (filter_by) {

            case "0": // Filter by lead group
                Logger.warn(`Importing leads .... , Filter applied by : Lead Group`);
                result = await this.lead_management.find({ lead_group_uuid }, { phone_number: 1, _id: 0 })
                    .exec();
                leadArr = this.filterData(allLeads, result);
                break;

            case "1": // Filter by Tenant
                Logger.warn(`Importing leads .... , Filter applied by : Tenant`);
                result = await this.lead_management.find({ tenant_uuid }, { phone_number: 1, _id: 0 })
                    .exec();
                leadArr = this.filterData(allLeads, result);
                break;

            case "2": // Filter by CSV [Remove duplicate by custom_phone_number]
                Logger.warn(`Importing leads .... , Filter applied by : CSV`);
                const leadData = allLeads.map(({ custom_phone_number }) => custom_phone_number);
                const filtered = allLeads.filter(({ custom_phone_number }, index) =>
                    !leadData.includes(custom_phone_number, index + 1));
                leadArr = filtered;
                break;

            case "3": // No duplicate check
                Logger.warn(`Importing leads .... , Filter applied by : No duplicate check`);
                leadArr = allLeads;
                break;
        }

        try {
            insertedRecords = leadArr != undefined ? leadArr.length : 0;
            if (insertedRecords != 0) {
                await this.assignUserUuid(leadArr, user_uuid);
                await this.lead_management.insertMany(leadArr, { ordered: false });
            }
        } catch (error) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        const totalCount = insertedRecords; // Total count of CSV data
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
            Logger.debug(`${file} file deleted`);
        });
        const leadDistribution = {}; // Object to track lead distribution per user

        // Calculate lead distribution per user
        let leadsPerUser = Math.floor(insertedRecords / user_uuid.length);
        let remainingLeads = insertedRecords % user_uuid.length;

        for (let i = 0; i < user_uuid.length; i++) {
            const user = user_uuid[i];

            // Add leads to the user
            let leadsToAdd = leadsPerUser;
            if (remainingLeads > 0) {
                leadsToAdd++;
                remainingLeads--;
            }

            const userRecord = usersData.find((data) => data.user_uuid === user);
            if (userRecord) {
                leadDistribution[userRecord.username.username] = leadsToAdd;
            }
        }

        let logObject = {
            totalCount: totalCount,
            totalUserSelected: user_uuid.length,
            leadDistribution: leadDistribution,
        };
        Logger.debug(JSON.stringify(logObject));

        return this.commonDbFn.sendResponseWithMessage(
            HttpStatus.OK,
            `Imported ${insertedRecords} ${recordText.trim()}`,
            {
                totalCount: totalCount,
                totalUserSelected: user_uuid.length,
                leadDistribution: leadDistribution,
            }
        );
    }
    /*
    @Usage                 : To create object with csv data
    @Param postData        : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    /*async  assignUserUuid(allLeads, user_uuid) {
   const userCount = user_uuid.length;
   let userIndex = 0;

   allLeads.forEach(lead => {
     // Assign the user_uuid as an array to the current lead
     lead.user_uuid = user_uuid[userIndex];

     // Move to the next user_uuid (circularly)
     userIndex = (userIndex + 1) % userCount;
   });

   return allLeads;
 }*/


    async assignUserUuid(allLeads, user_uuid) {
        const userCount = user_uuid.length;
        const leadsCount = allLeads.length;

        allLeads.forEach((lead, index) => {
            // Calculate the user index for the current lead
            const userIndex = Math.floor((index * userCount) / leadsCount);

            // Assign the user_uuid to the current lead
            lead.user_uuid = user_uuid[userIndex];
        });

        return allLeads;
    }



    async addCsvDatadis(postData) {
        let { user_uuid, file, tenant_uuid, lead_group_uuid, phone_code, manager_uuid } = postData;

        //Added by manish 27-07-23

        //Get disposition_uuid with name = "NEW"
        let disposition_uuid, campaignUUID;
        try {
            disposition_uuid = await this.disposition.findOne({ code: "NEW" }, { disposition_uuid: 1, _id: 0 }).exec();
            campaignUUID = await this.lead_group.findOne({ uuid: lead_group_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
        } catch (error) {
            Logger.error("Unable to fetch disposition OR Campaign", error.message);
        }
        //End

        let allLeads = [];
        let obj: any = {};
        if (!Array.isArray(user_uuid)) {
            user_uuid = [user_uuid];
        }
        const userCount = user_uuid.length;
        //let currentUserIndex = 0;
        let currentUserIndex = -1;

        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
            parseStream(stream)
                .on('error', error => console.error(error))
                .on('data', row => {
                    console.log("======DATA USER-=====", user_uuid);
                    currentUserIndex = (currentUserIndex + 1) % userCount;
                    //currentUserIndex = currentUserIndex + 1;
                    console.log(currentUserIndex)
                    console.log("=====CURRENTUSER INDEX======", user_uuid[currentUserIndex]);
                    // if(!isNaN(row[0])){
                    obj = {
                        // user_uuid,
                        // user_uuid: user_uuid[currentUserIndex],
                        // name :row[0],
                        first_name: row[0],
                        last_name: row[1],
                        phone_number: row[8],
                        email: row[10],
                        lead_status: disposition_uuid.disposition_uuid,
                        // agent:row[0],
                        lead_group_uuid,
                        // status: "0",
                        tenant_uuid,
                        phone_code,
                        campaign_uuid: campaignUUID?.campaign_uuid,
                        campaign_flag: campaignUUID?.campaign_flag,
                        custom_phone_number: phone_code.concat(row[8]),
                        manager_uuid: manager_uuid
                    }
                    allLeads.push(obj);

                    //   }
                })
                .on('end', async (rowCount: number) => {
                    resolve(allLeads);
                });
        });
    }

    /*
    @Usage                    : Update multiple lead
    @Param leadBatchUpdateDto : Single or multiple params will receive here
    @return Object            : Success / Error
    */

    async leadBatchUpdate(leadBatchUpdateDto: LeadBatchUpdateDto) {
        console.log("leadBatchUpdateDto", leadBatchUpdateDto);
        const { user_uuid, lead_status, lead_group_uuid, tenant_uuid, first_name, first_name_flag, last_name_flag, phone_number_flag, phone_code_flag, last_name, phone_code, phone_number, user_uuid_filter, lead_status_filter, lead_group_uuid_filter } = leadBatchUpdateDto;
        // const { 'first_name?i': firstName } = leadBatchUpdateDto;
        // const firstName = leadBatchUpdateDto[ 'first_name?i' ];
        let where: any = [];
        where.push({ tenant_uuid });

        let key, first_search_flag, last_search_flag, phone_number_search_flag, phone_code_search_flag;

        if (first_name_flag && first_name_flag.includes("|")) {
            key = first_name_flag.split("|")[0].trim();
            first_search_flag = parseInt(first_name_flag.split("|")[1].trim());
        } else {
            key = first_name_flag;
            first_search_flag = -1;
        }

        if (last_name_flag && last_name_flag.includes("|")) {
            key = last_name_flag.split("|")[0].trim();
            last_search_flag = parseInt(last_name_flag.split("|")[1].trim());
        } else {
            key = last_name_flag;
            last_search_flag = -1;
        }

        if (phone_number_flag && phone_number_flag.includes("|")) {
            key = phone_number_flag.split("|")[0].trim();
            phone_number_search_flag = parseInt(phone_number_flag.split("|")[1].trim());
        } else {
            key = phone_number_flag;
            phone_number_search_flag = -1;
        }

        if (phone_code_flag && phone_code_flag.includes("|")) {
            key = phone_code_flag.split("|")[0].trim();
            phone_code_search_flag = parseInt(phone_code_flag.split("|")[1].trim());
        } else {
            key = phone_code_flag;
            phone_code_search_flag = -1;
        }
        console.log("first name", first_search_flag)


        // if ( first_name != "" && first_name != undefined ) { where.push( { first_name } ) }
        // if ( last_name != "" && last_name != undefined ) { where.push( { last_name } ) }
        // if ( email != "" && email != undefined ) { where.push( { email } ) }
        // if ( phone_number != "" && phone_number != undefined ) { where.push( { phone_number } ) }
        // if ( where.length == 0 ) { where = {} }
        // console.log( "Search Flag:", searchFlag );
        // console.log( "first name", first_name )

        // Handle first_name
        switch (first_search_flag) {
            case 1: // Begins with
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $regex: `^${first_name}`, $options: "i" } });
                }
                break;
            case 2: // Contains
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $regex: first_name, $options: "i" } });
                }
                break;
            case 3: // Does not contain
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $regex: `^((?!${first_name}).)*$`, $options: "i" } });
                }
                break;
            case 4: // Is equal to
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: first_name });
                }
                break;
            case 5: // In not equal to
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $ne: first_name } });
                }
                break;
            case 6: // Ends with
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $regex: `${first_name}$`, $options: "i" } });
                }
                break;
            default:
                // Default behavior (Begins with)
                if (first_name != "" && first_name != undefined) {
                    where.push({ first_name: { $regex: `^${first_name}`, $options: "i" } });
                }
        }

        // Handle last_name based on searchFlag
        switch (last_search_flag) {
            case 1: // Begins with
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $regex: `^${last_name}`, $options: "i" } });
                }
                break;
            case 2: // Contains
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $regex: last_name, $options: "i" } });
                }
                break;
            case 3: // Does not contain
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $regex: `^((?!${last_name}).)*$`, $options: "i" } });
                }
                break;
            case 4: // Is equal to
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: last_name });
                }
                break;
            case 5: // In not equal to
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $ne: last_name } });
                }
                break;
            case 6: // Ends with
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $regex: `${last_name}$`, $options: "i" } });
                }
                break;
            default:
                // Default behavior (Begins with)
                if (last_name != "" && last_name != undefined) {
                    where.push({ last_name: { $regex: `^${last_name}`, $options: "i" } });
                }
        }

        // Handle phone_code based on searchFlag
        switch (phone_code_search_flag) {
            case 1: // Begins with
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $regex: `^${phone_code}`, $options: "i" } });
                }
                break;
            case 2: // Contains
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $regex: phone_code, $options: "i" } });
                }
                break;
            case 3: // Does not contain
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $regex: `^((?!${phone_code}).)*$`, $options: "i" } });
                }
                break;
            case 4: // Is equal to
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: phone_code });
                }
                break;
            case 5: // In not equal to
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $ne: phone_code } });
                }
                break;
            case 6: // Ends with
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $regex: `${phone_code}$`, $options: "i" } });
                }
                break;
            default:
                // Default behavior (Begins with)
                if (phone_code != "" && phone_code != undefined) {
                    where.push({ phone_code: { $regex: `^${phone_code}`, $options: "i" } });
                }
        }

        // Handle phone_number based on searchFlag
        switch (phone_number_search_flag) {
            case 1: // Begins with
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $regex: `^${phone_number}`, $options: "i" } });
                }
                break;
            case 2: // Contains
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $regex: phone_number, $options: "i" } });
                }
                break;
            case 3: // Does not contain
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $regex: `^((?!${phone_number}).)*$`, $options: "i" } });
                }
                break;
            case 4: // Is equal to
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: phone_number });
                }
                break;
            case 5: // In not equal to
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $ne: phone_number } });
                }
                break;
            case 6: // Ends with
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $regex: `${phone_number}$`, $options: "i" } });
                }
                break;
            default:
                // Default behavior (Begins with)
                if (phone_number != "" && phone_number != undefined) {
                    where.push({ phone_number: { $regex: `^${phone_number}`, $options: "i" } });
                }
        }

        if (user_uuid_filter && (user_uuid_filter != "" || user_uuid_filter != undefined)) {
            where.push({ user_uuid: user_uuid_filter })
        }

        if (lead_status_filter && (lead_status_filter != "" || lead_status_filter != undefined)) {
            where.push({ $or: [{ lead_status: lead_status_filter }, { lead_status_1: lead_status_filter }, { lead_status_2: lead_status_filter }] })
        }

        if (lead_group_uuid_filter && (lead_group_uuid_filter != "" || lead_group_uuid_filter != undefined)) {
            where.push({ lead_group_uuid: lead_group_uuid_filter })
        }

        let updateBody = { lead_status, user_uuid, lead_group_uuid };

        if (user_uuid == "" || user_uuid == undefined) delete updateBody.user_uuid;
        if (lead_status == "" || lead_status == undefined) delete updateBody.lead_status;
        if (lead_group_uuid == "" || lead_group_uuid == undefined) delete updateBody.lead_group_uuid;

        //Get campaign based on lead_group_uuid
        if (lead_group_uuid != "" || lead_group_uuid != undefined) {
            let result = await this.lead_group.findOne({ uuid: lead_group_uuid, tenant_uuid }, { campaign_uuid: 1, campaign_flag: 1, _id: 0 }).exec();
            updateBody["campaign_uuid"] = result?.campaign_uuid;
            updateBody["campaign_flag"] = result?.campaign_flag;
        }
        if (lead_status) {
            updateBody["lead_status_1"] = "";
            updateBody["lead_status_2"] = "";
        }
        console.log("========updateBody=======");
        console.log(updateBody);
        console.log("==========where==========");
        console.log(where);
        let response = await this.lead_management.updateMany({ $and: where }, updateBody);
        let recordText = response.modifiedCount <= 1 ? "record" : "records";
        Logger.debug(`Updated ${response.modifiedCount} ${recordText}`);
        await this.commonDbFn.leads_update_count_update(this.lead_group, this.lead_management, tenant_uuid);
        if (updateBody['campaign_flag'] == 'blended') {
            let campaign_data = await this.blended_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.blended_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.blended_campaign, data.uuid);
                }
            })
        } else {
            let campaign_data = await this.outbound_campaign.find({ tenant_uuid }).select('uuid').exec();
            // console.log( campaign_data );
            campaign_data?.map((data) => {
                if (data.uuid != '' && data.uuid != undefined) {
                    this.commonDbFn.leads_count_update(this.lead_group, this.lead_management, this.outbound_campaign, lead_group_uuid, data.uuid);
                    this.commonDbFn.leads_in_queue_count_update(this.leads_in_queue, this.outbound_campaign, data.uuid);
                }
            })
        }

        // Call resetLeads after successful batch update
        if (updateBody['campaign_uuid'] && lead_group_uuid && tenant_uuid) {
            const resetLeadDto: ResetLeadDto = {
                lead_group_uuid: lead_group_uuid as string,
                campaign_uuid: updateBody['campaign_uuid'] as string,
                tenant_uuid: tenant_uuid as string
            };
            try {
                // Use appropriate service based on campaign_flag
                if (updateBody['campaign_flag'] === 'blended') {
                    await this.blendedCampaignService.resetLeads(resetLeadDto);
                } else {
                    await this.outboundCampaignService.resetLeads(resetLeadDto);
                }
                Logger.debug(`Reset leads called successfully for campaign: ${updateBody['campaign_uuid']} after batch update`);
            } catch (error) {
                Logger.error(`Error calling resetLeads after batch update: ${error.message}`);
            }
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Batch updated successfully");
    }

    async getUsername(user_uuid) {
        let allData, finalArr = [];
        let self = this;
        return new Promise(async (resolve, reject) => {
            allData = user_uuid.map(async (data) => {
                const username = await self.user.findOne({ uuid: data }, { username: 1, _id: 0 }).exec();
                let obj = {
                    user_uuid: data,
                    username
                };
                finalArr.push(obj);

            });
            await Promise.all(allData);
            resolve(finalArr);

        });
    }


    /*
    @Usage              : To fetch lead details with call
    @Param queryParam   : Request params
    @return Object      : Array of an object with lead details with call and notes
    */

    async fetchLeadWithCallInfoAndNotes(queryParam, lead_management_uuid) {
        const { uuid, tenant_uuid, timezone } = queryParam;
        let finalArray = [], obj;

        //Fetch lead details
        let populateFileds = [{ path: "user", select: "username fullname -_id -uuid" }, { path: "tenant", select: "tenant_name -_id -uuid" }, { path: "country", select: 'country nicename -_id -uuid' }, { path: "disposition", select: "name" }, { path: "campaign_details", select: 'name -_id -uuid' }];
        let populateDisposition = [{ path: "user", select: "username fullname -_id" }, { path: "disposition_details", select: "name -_id" }];
        let leadData = await this.lead_management.find({ lead_management_uuid, tenant_uuid }).populate(populateFileds).exec();
        obj = { "lead_information": leadData };
        finalArray.push(obj);

        //Fetch cdrs details based on lead uuid
        let cdrsData = await this.cdrs.find({ lead_uuid: lead_management_uuid, tenant_uuid }, { user_uuid: 1, callstart: 1, _id: 0, custom_callid: 1, direction: 1, billsecond: 1, lead_uuid: 1, hangup_cause: 1, createdAt: 1 }).populate(populateDisposition).sort({ _id: -1 }).exec();

        //Fetch notes based on custom_callid received from cdrs
        let notesData: any = await this.getNotes(cdrsData, uuid, timezone);
        obj = { "cdrs_and_notes": notesData };
        finalArray.push(obj);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, finalArray);
    }

    /*
  @Usage              : To fetch custom-field details
  @Param queryParam   : Request params
  @return Object      : Array of an object with custom-field details
  */

    async fetchcustomfields(queryParam, lead_group_uuid) {
        const { uuid, tenant_uuid, timezone } = queryParam;

        console.log(queryParam);
        console.log("lead_group_uuid to search:", lead_group_uuid);

        // Find all custom fields where lead_group_uuid contains the provided UUID
        let custom_field_data: any[] = await this.custom_fields.find({
            tenant_uuid,
            $or: [
                { lead_group_uuid: lead_group_uuid },
                { lead_group_uuid: new RegExp(`^${lead_group_uuid},`) },
                { lead_group_uuid: new RegExp(`,${lead_group_uuid},`) },
                { lead_group_uuid: new RegExp(`,${lead_group_uuid}$`) }
            ]
        }).lean().exec();

        // Post-process: populate lead_groups manually for each record
        for (let i = 0; i < custom_field_data.length; i++) {
            const field = custom_field_data[i];

            // Convert comma-separated string to array
            const leadGroupUuids = field.lead_group_uuid
                ? field.lead_group_uuid.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];

            // Find all matching lead groups
            const leadGroups = await this.leadGroupModel.find(
                { uuid: { $in: leadGroupUuids } },
                'name uuid'
            ).lean();

            // Find tenant
            const tenant = await this.tenantModel.findOne(
                { uuid: field.tenant_uuid },
                'tenant_name uuid'
            ).lean();

            // Update the field object - create new object instead of modifying
            custom_field_data[i] = {
                ...field,
                lead_group_uuid: leadGroupUuids,
                lead_group: leadGroups,
                tenant: tenant ? [tenant] : []
            };
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, custom_field_data);
    }

    /*
    @Usage              : To fetch notes based on cdrs_uuid
    @Param cdrsData     : Cdrs data
    @Param uuid         : Agent uuid
    @return Object      : Array of an object with calls and notes details
    */

    async getNotes(cdrsData, uuid, timezone) {
        // console.log( timezone );
        // console.log( "timezone===========" );
        let finalArray = [], obj = {}, allData, notesArray = [];
        let populateFields = [{ path: "user", select: "username fullname -_id" }];
        return new Promise(async (resolve, reject) => {
            let notesData;
            allData = cdrsData?.map(async (data) => {
                console.log("DATA", data);
                // notesData = await this.notes.find({ $and: [{ }, { $or: [{ cdrs_uuid: data.custom_callid }, { lead_uuid: data.lead_uuid }] }] }, { _id: 0, tenant_uuid: 0, note_uuid: 0 }).populate(populateFields).sort({ _id: -1 }).exec();
                notesData = await this.notes.find({ $and: [{ cdrs_uuid: data.custom_callid }, { lead_uuid: data.lead_uuid }] }, { _id: 0, tenant_uuid: 0, note_uuid: 0 }).populate(populateFields).sort({ _id: -1 }).exec();

                notesData.map((newData, i) => {
                    notesArray.push(newData);
                });
                obj = {
                    "cdrs_info": { username: data?.user[0]?.username, fullname: data?.user[0]?.fullname, callstart: data.callstart, converted_date: moment(new Date(data.createdAt)).tz(timezone).format("YYYY-MM-DD HH:mm:ss"), custom_callid: data.custom_callid, lead_uuid: data.lead_uuid, direction: data.direction, billsecond: data.billsecond, disposition: data?.disposition_details[0]?.name },
                    "notes_info": notesArray
                };
                console.log(obj);
                console.log("======obj=========");
                // finalArray.push(obj);
                notesArray = [];
                return obj;
            })
            let result = await Promise.all(allData);
            resolve(result);
        })
    }


    /*
    @Usage              : To bind lead with cdrs and notes
    @Param cdrs_uuid    : custom_callid
    @Param lead_uuid    : uuid of last inserted lead
    @return Object      : Success / Error
    */

    async bindLeadWithCdrsAndNotes(cdrs_uuid, lead_uuid) {
        try {
            let response;
            response = await this.cdrs.updateMany({ custom_callid: cdrs_uuid }, { lead_uuid }).exec();
            if (response.modifiedCount > 0) {
                Logger.debug(`Bind lead successfully with cdrs custom_callid : ${cdrs_uuid}`);
            } else {
                Logger.error(`Unable to bind lead with cdrs custom_callid : ${cdrs_uuid}`);
            }

            response = await this.notes.updateMany({ custom_callid: cdrs_uuid }, { lead_uuid }).exec();
            if (response.modifiedCount > 0) {
                Logger.debug(`Bind lead successfully with notes cdrs_uuid : ${cdrs_uuid}`);
            } else {
                Logger.error(`Unable to bind lead with notes cdrs_uuid : ${cdrs_uuid}`);
            }
        } catch (error) {
            Logger.error(`Catch Block === Unable to bind lead`, error.message);
        }
    }

    /*
    @Usage              : To filter data
    @Param allLeads     : CSV data
    @Param result       : filter data
    @return Array       : lead data
    */

    filterData(allLeads, result) {
        let matched, leadArr = [];
        /*if(result.length == 0){
          leadArr.push(allLeads);
          return leadArr;
        }*/
        allLeads.map((data) => {
            matched = result.filter(function (el) {
                return el.custom_phone_number == data.custom_phone_number;
            });
            if (matched.length == 0) {
                leadArr.push(data);
            }
        });
        return leadArr;
    }

    fetchUnallocatedLeads(queryParams) {
        let searchFields = ["first_name", "last_name", "address", "custom_phone_number"];
        let populateFields = [{ path: "country", select: 'country nicename -_id -uuid' }, { path: "user", select: 'username fullname -_id -uuid' }, { path: "disposition", select: 'name -_id -disposition_uuid' }, { path: "disposition_1", select: 'name -_id -disposition_uuid' }, { path: "disposition_2", select: 'name -_id -disposition_uuid' }, { path: "lead_group", select: 'name -_id -uuid' }, { path: "campaign_details", select: 'name -_id -uuid' }, { path: "pbx_lead_status", select: 'name -_id -pbx_lead_status_uuid' }, { path: "cdrs_details", select: 'billsecond createdAt -_id', options: { sort: { createdAt: -1 }, limit: 1 } }];
        console.log("queryParams leads", queryParams);

        queryParams.tableName = 'unallocated_leads'
        return this.commonDbFn.findAllWithPagination(this.lead_management, queryParams, searchFields, populateFields);
    }
}
