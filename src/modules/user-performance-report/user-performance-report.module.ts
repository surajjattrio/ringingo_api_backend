import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPerformanceReportController } from './controllers/user-performance-report.controller';
import { UserPerformanceReportService } from './services/user-performance-report.service';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';
import { tenantSchema, TenantSchema } from '../tenant/schema/tenant.schema';
import { agentLiveReportSchema, AgentLiveReportSchema } from '../call-center/schema/agent-live-report.schema';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { userPerformanceReportSchema, UserPerformanceReportSchema } from './schema/user-performance-report.schema';
import { cdrsSummarySchema, CdrsSummarySchema } from '../cdrs/schema/cdrs-summary.schema';
import { AgentLoginLogoutSchema, agentLoginLogoutSchema } from '../call-center/schema/agent-login-logout.schema';
import { idleStateAgentSchema, IdleStateAgentSchema } from '../call-center/schema/idle-state-agent.schema';
import { breakcodeSchema, BreakcodeSchema } from '../breakcode/schema/breakcode.schema';
//import { acwAgentSchema, AcwAgentSchema } from '../call-center/schema/acw-agent.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: UserPerformanceReportSchema.name, schema: userPerformanceReportSchema },
    { name: CdrsSchema.name, schema: cdrsSchema },
    { name: TenantSchema.name, schema: tenantSchema },
    { name: AgentLiveReportSchema.name, schema: agentLiveReportSchema },
    { name: DispositionSchema.name, schema: dispositionSchema },
    { name: CdrsSummarySchema.name, schema: cdrsSummarySchema },
    { name: AgentLoginLogoutSchema.name, schema: agentLoginLogoutSchema },
    { name: CdrsSchema.name, schema: cdrsSchema },
    { name: IdleStateAgentSchema.name, schema: idleStateAgentSchema },
    { name: BreakcodeSchema.name, schema: breakcodeSchema },
  //  { name: AcwAgentSchema.name, schema: acwAgentSchema },
    ])],
    controllers: [UserPerformanceReportController],
    providers: [UserPerformanceReportService],
    exports: [MongooseModule,UserPerformanceReportService]
})

export class UserPerformanseReportModule { }

