import { Module, forwardRef } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { ExtensionModule } from '../extension/extension.module';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CdrsSummarySchema, cdrsSummarySchema } from '../cdrs/schema/cdrs-summary.schema';
import { CdrsModule } from '../cdrs/cdrs.module';
import { DidModule } from '../did/did.module';
import { InboundCampaignModule } from '../campaigns/inbound-campaign/inbound-campaign.module';
import { OutboundCampaignModule } from '../campaigns/outbound-campaign/outbound-campaign.module';
import { BlendedCampaignModule } from '../campaigns/blended-campaign/blended-campaign.module';
import { ManagerModule } from '../manager/manager.module';
import { TrunkModule } from '../trunk/trunk.module';
import { AgentLoginLogoutSchema, agentLoginLogoutSchema } from '../call-center/schema/agent-login-logout.schema';
import { IdleStateAgentSchema, idleStateAgentSchema } from '../call-center/schema/idle-state-agent.schema';

@Module({
    imports: [
        ExtensionModule, 
        UserModule, 
        forwardRef(() => TenantModule), 
        MongooseModule.forFeature([
            { name: CdrsSummarySchema.name, schema: cdrsSummarySchema },
            { name: AgentLoginLogoutSchema.name, schema: agentLoginLogoutSchema },
            { name: IdleStateAgentSchema.name, schema: idleStateAgentSchema }
        ]), 
        CdrsModule, 
        DidModule, 
        InboundCampaignModule, 
        OutboundCampaignModule, 
        BlendedCampaignModule, 
        ManagerModule, 
        TrunkModule
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService]
})
export class DashboardModule { }

