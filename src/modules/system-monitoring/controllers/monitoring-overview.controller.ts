import { Controller, ForbiddenException, Get, HttpStatus, InternalServerErrorException, Logger, Req } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { MonitoringService } from "../services/monitoring.service";

@Controller("admin/monitoring")
export class MonitoringOverviewController {
  private readonly logger = new Logger(MonitoringOverviewController.name);

  constructor(private readonly monitoring: MonitoringService) {}

  @Get("overview")
  @SkipThrottle()
  async overview(@Req() req) {
    this.logger.log(`overview requested by user=${req.user?.id} role=${req.user?.role}`);

    if (req.user?.role !== "master_admin") {
      this.logger.warn(`overview forbidden for user=${req.user?.id} role=${req.user?.role}`);
      throw new ForbiddenException("Only super admin can access monitoring");
    }

    try {
      const data = await this.monitoring.collectNow();
      this.logger.log(
        `overview collected in ${data.durationMs}ms - ` +
          `healthy=${data.summary.healthy} degraded=${data.summary.degraded} ` +
          `unhealthy=${data.summary.unhealthy} unreachable=${data.summary.unreachable}`,
      );
      return { statusCode: HttpStatus.OK, data };
    } catch (err) {
      this.logger.error(`overview collection failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException("Failed to collect monitoring overview");
    }
  }
}
