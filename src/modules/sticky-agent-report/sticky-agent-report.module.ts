import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StickyAgentReportController } from './controllers/sticky-agent-report.controller';
import {stickyAgentSchema,StickyAgentSchema} from "src/modules/sticky-agent/schema/sticky-agent.schema";
import { StickyAgentReportService } from './services/sticky-agent-report.service';

@Module({
    imports : [MongooseModule.forFeature([ { name : StickyAgentSchema.name , schema : stickyAgentSchema }, ])],
    controllers:[StickyAgentReportController],
    providers:[StickyAgentReportService]
})
export class StickyAgentReportModule {}
