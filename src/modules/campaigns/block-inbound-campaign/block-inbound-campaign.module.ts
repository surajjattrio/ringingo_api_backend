import { Module } from '@nestjs/common';
import { BlockInboundCampaignController } from './controllers/block-inbound-campaign.controller';
import { BlockInboundCampaignService } from './services/block-inbound-campaign.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockInboundCampaignSchema, blockInboundCampaignSchema } from './schema/block-inbound-campaign.schema';

@Module({
    imports:[MongooseModule.forFeature([
        {name : BlockInboundCampaignSchema.name , schema : blockInboundCampaignSchema}
    ])],
    controllers : [BlockInboundCampaignController],
    providers : [BlockInboundCampaignService]
})
export class BlockInboundCampaignModule {}

