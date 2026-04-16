import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadGroupSchema, leadGroupSchema } from './schema/lead-group.schema';
import { LeadGroupController } from './controllers/lead-group.controller';
import { LeadGroupService } from './services/lead-group.service';
import { LeadManagementModule } from '../lead-management/lead-management.module';
import { LeadsInQueueSchema, leadsInQueueSchema } from '../lead-management/schema/leads-in-queue.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';
import { OutboundCampaignSchema, outboundCampaignSchema } from '../campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { BlendedCampaignSchema, blendedCampaignSchema } from '../campaigns/blended-campaign/schema/blended-campaign.schema';
import { VoiceBroadcastSchema, voiceBroadcastSchema } from '../voice-broadcast/schema/voice-broadcast.schema';

@Module({
    imports: [MongooseModule.forFeature([
        { name: LeadGroupSchema.name, schema: leadGroupSchema },
        { name: ManagerSchema.name, schema: managerSchema },
        { name: LeadsInQueueSchema.name, schema: leadsInQueueSchema },
        { name: LeadManagementSchema.name, schema: leadManagementSchema },
        { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
        { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
        { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema },
    ])
        // , forwardRef(() => LeadManagementModule)
    ],
    controllers: [LeadGroupController],
    providers: [LeadGroupService],
    exports: [MongooseModule]
})
export class LeadGroupModule { }

