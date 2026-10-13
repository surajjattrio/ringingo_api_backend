import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ServerSyncController } from "./controllers/server-sync.controller";
import { ServerSyncService } from "./services/server-sync.service";
import { ServerSyncHistorySchema, serverSyncHistorySchema } from "./schema/server-sync-history.schema";
import { ServerConfigSchema, serverConfigSchema } from "./schema/server-config.schema";

// IMPORT RELATED SCHEMAS
import { RolesSchema, rolesSchema } from "src/modules/roles/schema/roles-schema";
import { TenantSchema, tenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserRoleSchema, userRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { UserGroupSchema, userGroupSchema } from "src/modules/user-group/schema/user-group.schema";
import { DidSchema, didSchema } from "src/modules/did/schema/did.schema";
import { AdminDidSchema, admindidSchema } from "src/modules/admin-did/schema/admin-did.schema";
import { TrunkSchema, trunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { OutgoingRulesSchema, outgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";
import { BreakcodeSchema, breakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";
import { DispositionSchema, dispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { OutboundCampaignSchema, outboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignSchema, inboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignSchema, blendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { LeadGroupSchema, leadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { UserSchema, userSchema } from "src/modules/user/schema/user.schema";
import { ExtensionSchema, extensionSchema } from "src/modules/extension/schema/extension.schema";
import { AdminIpMappingSchema, adminipMappingSchema } from "src/modules/admin-ip-mapping/schema/admin-ip-mapping.schema";
import { IpMappingSchema, ipMappingSchema } from "src/modules/ip-mapping/schema/ip-mapping.schema";
import { VoiceBroadcastSchema, voiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";
import { CountrySchema, countrySchema } from "src/modules/country/schema/country.schema";
import { TimezoneSchema, timezoneSchema } from "src/modules/timezone/schema/timezone.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ServerConfigSchema.name, schema: serverConfigSchema },
            { name: ServerSyncHistorySchema.name, schema: serverSyncHistorySchema },
            { name: RolesSchema.name, schema: rolesSchema },
            { name: TenantSchema.name, schema: tenantSchema },
            { name: UserRoleSchema.name, schema: userRoleSchema },
            { name: UserGroupSchema.name, schema: userGroupSchema },
            { name: DidSchema.name, schema: didSchema },
            { name: AdminDidSchema.name, schema: admindidSchema },
            { name: TrunkSchema.name, schema: trunkSchema },
            { name: OutgoingRulesSchema.name, schema: outgoingRulesSchema },
            { name: BreakcodeSchema.name, schema: breakcodeSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: OutboundCampaignSchema.name, schema: outboundCampaignSchema },
            { name: InboundCampaignSchema.name, schema: inboundCampaignSchema },
            { name: BlendedCampaignSchema.name, schema: blendedCampaignSchema },
            { name: LeadGroupSchema.name, schema: leadGroupSchema },
            { name: UserSchema.name, schema: userSchema },
            { name: ExtensionSchema.name, schema: extensionSchema },
            { name: AdminIpMappingSchema.name, schema: adminipMappingSchema },
            { name: IpMappingSchema.name, schema: ipMappingSchema },
            { name: VoiceBroadcastSchema.name, schema: voiceBroadcastSchema },
            { name: CountrySchema.name, schema: countrySchema },
            { name: TimezoneSchema.name, schema: timezoneSchema },
        ]),
    ],
    controllers: [ServerSyncController],
    providers: [ServerSyncService],
    exports: [ServerSyncService],
})
export class ServerSyncModule { }
