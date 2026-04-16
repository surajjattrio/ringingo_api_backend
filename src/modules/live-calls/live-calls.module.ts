import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { TrunkModule } from '../trunk/trunk.module';
import { LiveCallsController } from './controllers/live-calls.controller';
import { LiveCallsService } from './services/live-calls.service';

@Module({
    imports:[TenantModule,TrunkModule],
    controllers:[LiveCallsController],
    providers:[LiveCallsService]
})
export class LiveCallsModule {}
