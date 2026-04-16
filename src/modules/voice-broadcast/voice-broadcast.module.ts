import { Module } from '@nestjs/common';
import { VoiceBroadcastController } from './controllers/voice-broadcast.controller';
import { VoiceBroadcastService } from './services/voice-broadcast.service';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { VoiceBroadcastSchema, voiceBroadcastSchema } from './schema/voice-broadcast.schema';
import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';
import { LeadBroadcastQueueSchema, leadBroadcastQueueSchema } from './schema/lead-broadcast-queue.schema';
import { MainBroadcastQueueSchema, mainBroadcastQueueSchema } from './schema/main-broadcast-queue.schema';
import { LeadGroupSchema, leadGroupSchema } from '../lead-group/schema/lead-group.schema';
import { OutboundCampaignDialableStatus, outboundCampaignDialableStatus } from '../campaigns/outbound-campaign/schema/outbound-campaign-dialable-status';
import { TrunkSchema, trunkSchema } from '../trunk/schema/trunk.schema';
import { CallerIdSchema, callerIdSchema } from '../caller-id-group/schema/caller-ids.schema';
import { DispositionSchema, dispositionSchema } from '../disposition/schema/disposition.schema';
import { TenantSchema, tenantSchema } from '../tenant/schema/tenant.schema';

@Module( {
    imports: [ MongooseModule.forFeature( [
        { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema },
        { name: LeadManagementSchema.name, schema: leadManagementSchema },
        { name: LeadBroadcastQueueSchema.name, schema: leadBroadcastQueueSchema },
        { name: MainBroadcastQueueSchema.name, schema: mainBroadcastQueueSchema },
        { name: LeadGroupSchema.name, schema: leadGroupSchema },
        { name: OutboundCampaignDialableStatus.name, schema: outboundCampaignDialableStatus },
        { name: TrunkSchema.name, schema: trunkSchema },
        { name: CallerIdSchema.name, schema: callerIdSchema },
        { name: DispositionSchema.name, schema: dispositionSchema },
        { name: TenantSchema.name, schema: tenantSchema },
    ] ) ],
    controllers: [ VoiceBroadcastController ],
    providers: [ VoiceBroadcastService ]
} )
export class VoiceBroadcastModule { }
