import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringSchema, monitoringSchema } from './schema/monitoring.schema';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringService } from './services/monitoring.service';

@Module({
    imports:[MongooseModule.forFeature([{ name : MonitoringSchema.name , schema : monitoringSchema }])],
    controllers:[MonitoringController],
    providers:[MonitoringService]
})
export class MonitoringModule {}
