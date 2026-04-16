import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManualDialSchema, manualDialSchema } from './schema/manual-dial.schema';
import { ManualDialController } from './controllers/manual-dial.controller';
import { ManualDialService } from './services/manual-dial.service';
import { OutboundCampaignSchema , outboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
import { LeadManagementSchema, leadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { BlendedCampaignSchema, blendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';


@Module({
    imports:[MongooseModule.forFeature([ 
        { name : ManualDialSchema.name , schema : manualDialSchema } ,
        { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
        { name: LeadManagementSchema.name, schema: leadManagementSchema },
        { name : BlendedCampaignSchema.name , schema : blendedCampaignSchema }
        ])
    ],
    controllers : [ManualDialController],
    providers:[ManualDialService],
  //  exports: [MongooseModule]
})
export class ManualDialModule {

}

