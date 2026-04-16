import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ActivityLogSchema, activityLogSchema } from "./schema/activity-log.schema";
import { ActivityLogService } from "./services/activity-log.service";
import { ActivityLogController } from "./controllers/activity-log.controller";
import { CommonModule } from "../common/common.module";
import { ManagerRoleSchema, managerRoleSchema } from "../manager-role/schema/manager-role.schema";
import { ManagerSchema, managerSchema } from "../manager/schema/manager.schema";
import { TenantSchema, tenantSchema } from "../tenant/schema/tenant.schema";
import { UserSchema, userSchema } from "../user/schema/user.schema";
import { MasterAdmin, MasterAdminSchema } from "../master-admin/schema/master-admin";
import { OutboundCampaignSchema, outboundCampaignSchema } from "../campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignSchema, inboundCampaignSchema } from "../campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignSchema, blendedCampaignSchema } from "../campaigns/blended-campaign/schema/blended-campaign.schema";
import { VoiceBroadcastSchema, voiceBroadcastSchema } from "../voice-broadcast/schema/voice-broadcast.schema";

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ActivityLogSchema.name, schema: activityLogSchema },
            { name: ManagerRoleSchema.name, schema: managerRoleSchema },
            { name: ManagerSchema.name, schema: managerSchema },
                { name: TenantSchema.name, schema: tenantSchema },
                { name: UserSchema.name, schema: userSchema },
                { name: MasterAdmin.name, schema: MasterAdminSchema },
                { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
                { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
                { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
                { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema },
            ]),
            CommonModule
        ],
        controllers: [ActivityLogController],
        providers: [ActivityLogService],
        exports: [ActivityLogService]
})
export class ActivityLogModule { }
