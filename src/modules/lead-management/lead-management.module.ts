import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadManagementController } from './controllers/lead-management.controller';
import { leadManagementSchema, LeadManagementSchema } from './schema/lead-management.schema';
import { LeadManagementService } from './services/lead-management.service';
import { OutboundCampaignModule } from '../campaigns/outbound-campaign/outbound-campaign.module';
import { BlendedCampaignModule } from '../campaigns/blended-campaign/blended-campaign.module';
import { leadsInQueueSchema, LeadsInQueueSchema } from './schema/leads-in-queue.schema';
import { LeadGroupModule } from '../lead-group/lead-group.module';
import { outboundCampaignDialableStatus, OutboundCampaignDialableStatus } from '../campaigns/outbound-campaign/schema/outbound-campaign-dialable-status';
import { blendedCampaignDialableStatus, BlendedCampaignDialableStatus } from '../campaigns/blended-campaign/schema/blended-campaign-dialable-status';
import { leadGroupSchema, LeadGroupSchema } from '../lead-group/schema/lead-group.schema';
import { userSchema, UserSchema } from '../user/schema/user.schema';
import { CdrsSchema, cdrsSchema } from '../cdrs/schema/cdrs.schema';
import { NotesSchema, notesSchema } from '../notes/schema/notes.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { OutboundCampaignSchema, outboundCampaignSchema } from '../campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { CustomFieldSchema, customfieldschema } from '../custom-field/schema/custom-field-schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from '../campaigns/blended-campaign/schema/blended-campaign.schema';
import { WhatsappmessageSchema, whatsappmessageSchema } from '../whatsapp-message/schema/whatsappmessage.schema';

@Module({
    /* imports:[MongooseModule.forFeature([ { name : LeadManagementSchema.name , schema : leadManagementSchema} ]) , MongooseModule.forFeature([ { name : LeadsInQueueSchema.name , schema : leadsInQueueSchema} ]) ,OutboundCampaignModule , LeadGroupModule],*/
    imports: [

        MongooseModule.forFeature([
            { name: LeadManagementSchema.name, schema: leadManagementSchema },
            { name: LeadsInQueueSchema.name, schema: leadsInQueueSchema },
            { name: OutboundCampaignDialableStatus.name, schema: outboundCampaignDialableStatus },
            { name: BlendedCampaignDialableStatus.name, schema: blendedCampaignDialableStatus },
            { name: LeadGroupSchema.name, schema: leadGroupSchema },
            { name: UserSchema.name, schema: userSchema },
            //{ name: CdrsSchema.name, schema: cdrsSchema },
            { name: "cdrs", schema: cdrsSchema },
            { name: NotesSchema.name, schema: notesSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
            { name: ManagerSchema.name, schema: managerSchema },
            { name: TenantSchema.name, schema: tenantSchema },
            { name: CustomFieldSchema.name, schema: customfieldschema },
            { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
            { name: WhatsappmessageSchema.name, schema: whatsappmessageSchema }
        ]),
        forwardRef(() => OutboundCampaignModule),
        forwardRef(() => BlendedCampaignModule)],
    controllers: [LeadManagementController],
    providers: [LeadManagementService],
    exports: [MongooseModule, LeadManagementService]
})
export class LeadManagementModule { }

