import { Module } from "@nestjs/common";
import { InternalHealthController } from "./controllers/internal-health.controller";
import { MonitoringOverviewController } from "./controllers/monitoring-overview.controller";
import { SystemMetricsService } from "./services/system-metrics.service";
import { SelfHealthService } from "./services/self-health.service";
import { MonitoringService } from "./services/monitoring.service";
import { RabbitmqManagementService } from "./services/rabbitmq-management.service";
import { MongoCheck } from "./checks/mongo.check";
import { FreeswitchCheck } from "./checks/freeswitch.check";
import { RabbitmqCheck } from "./checks/rabbitmq.check";

@Module({
  controllers: [InternalHealthController, MonitoringOverviewController],
  providers: [
    SystemMetricsService,
    SelfHealthService,
    MonitoringService,
    RabbitmqManagementService,
    MongoCheck,
    FreeswitchCheck,
    RabbitmqCheck,
  ],
})
export class SystemMonitoringModule {}
