import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutgoingRulesController } from './controllers/outgoing-rules.controller';
import { outgoingRulesSchema, OutgoingRulesSchema } from './schema/outgoing-rules.schema';
import { OutgoingRulesService } from './services/outgoing-rules.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
    imports:[MongooseModule.forFeature([ { name : OutgoingRulesSchema.name , schema : outgoingRulesSchema } ]) , forwardRef(() => TenantModule)],
    controllers:[OutgoingRulesController],
    providers:[OutgoingRulesService],
    exports : [MongooseModule]
})
export class OutgoingRulesModule {}
