import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StickyAgentController } from './controllers/sticky-agent.controller';
import { StickyAgentSchema, stickyAgentSchema } from './schema/sticky-agent.schema';
import { StickyAgentService } from './services/sticky-agent.service';

@Module({
    imports : [MongooseModule.forFeature([ { name : StickyAgentSchema.name , schema : stickyAgentSchema } ])],
    controllers:[StickyAgentController],
    providers:[StickyAgentService]
})
export class StickyAgentModule {}