import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateManualDialDto } from "../dto/create-manual-dial.dto";
import { ManualDialDocument, ManualDialSchema } from "../schema/manual-dial.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema, outboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { LeadManagementDocument, LeadManagementSchema, leadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema, blendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";


@Injectable()

export class ManualDialService {

    /*
    @Usage              : To load manual dial schema and other libraries
    @Param @InjectModel : It will load manual dial schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [manual_dial,commonDbFn] 
    */

    constructor(
        @InjectModel(ManualDialSchema.name) private readonly manual_dial: Model<ManualDialDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outbound_campaign: Model<OutboundCampaignDocument>,
        @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blended_campaign: Model<BlendedCampaignDocument>,
        private readonly commonDbFn: CommonDBFunctions

    ) { }

    /*
    @Usage                     : First it will check whether given name exist or not , if not then new Manual Dial will be created else it will throw error
    @Param createManualDialDto : Request paramter that we set into dto
    @return Object             : Success / Error 
    */

    async create(createManualDialDto: CreateManualDialDto) {
        const { custom_phone_number, dial_number, campaign_uuid, campaign_type } = createManualDialDto;
        let where = [{ dial_number }, { campaign_uuid }];
        let logMessages = {
            logErrorMsg: "Manual Dial already exist \n",
            logSuccessMsg: "Manual Dial created successfully \n",
        }
        // 0 - Outbound , 1 - Inbound , 2 - Blended
        let result;
        switch (campaign_type) {

            case "0":
                result = await this.outbound_campaign.findOne({ uuid: campaign_uuid }, { lead_group_uuid: 1, _id: 0 }).exec();
                break;

            case "2":
                result = await this.blended_campaign.findOne({ uuid: campaign_uuid }, { lead_group_uuid: 1, _id: 0 }).exec();
                break;

        }

        const { lead_group_uuid } = result;
        let leadData;

        if (lead_group_uuid != "" && dial_number != "") {
            let checkLeadExist = await this.lead_management.findOne({ $and: [{ lead_group_uuid }, { custom_phone_number: dial_number }] }).exec();
            if (checkLeadExist == null) {
                createManualDialDto.phone_number = dial_number;
                createManualDialDto.custom_phone_number = dial_number;
                createManualDialDto.lead_group_uuid = lead_group_uuid;

                createManualDialDto.first_name = "anonymous";
                createManualDialDto.last_name = "anonymous";

                leadData = new this.lead_management(createManualDialDto);
                await leadData.save();
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, leadData);
            }
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, checkLeadExist);
        }
    }
}
