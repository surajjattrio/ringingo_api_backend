import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as os from "os";
import { SystemMetricsService } from "./system-metrics.service";
import { MongoCheck } from "../checks/mongo.check";
import { FreeswitchCheck } from "../checks/freeswitch.check";
import { RabbitmqCheck } from "../checks/rabbitmq.check";
import { DependencyCheckResult, HealthPayload, HealthStatus } from "../types/health.types";

const CACHE_TTL_MS = 5000;

@Injectable()
export class SelfHealthService {
  private readonly logger = new Logger(SelfHealthService.name);
  private cached: { at: number; payload: HealthPayload } | null = null;

  constructor(
    private readonly metrics: SystemMetricsService,
    private readonly config: ConfigService,
    private readonly mongoCheck: MongoCheck,
    private readonly freeswitchCheck: FreeswitchCheck,
    private readonly rabbitmqCheck: RabbitmqCheck,
  ) {}

  async build(): Promise<HealthPayload> {
    if (this.cached && Date.now() - this.cached.at < CACHE_TTL_MS) {
      return this.cached.payload;
    }

    let processMetrics, systemMetrics, dependencies;
    try {
      [processMetrics, systemMetrics, dependencies] = await Promise.all([
        this.metrics.collectProcessMetrics(),
        this.metrics.collectSystemMetrics(),
        this.runDependencyChecks(),
      ]);
    } catch (err) {
      this.logger.error(`build() metrics/dependency collection failed: ${err.message}`, err.stack);
      throw err;
    }

    const status = this.deriveStatus(dependencies);

    const hostname = os.hostname();
    const payload: HealthPayload = {
      schemaVersion: 1,
      service: "backend-api",
      instance: `backend-api@${hostname}`,
      server: {
        hostname,
        ip: "",
        env: this.config.get<string>("ENVIRONMENT") || "unknown",
      },
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: {
        commit: this.config.get<string>("GIT_COMMIT") || null,
        buildTime: this.config.get<string>("BUILD_TIME") || null,
      },
      process: processMetrics,
      system: systemMetrics,
      dependencies,
    };

    this.cached = { at: Date.now(), payload };
    return payload;
  }

  private async runDependencyChecks(): Promise<DependencyCheckResult[]> {
    const settled = await Promise.allSettled([
      this.mongoCheck.run(),
      this.freeswitchCheck.run(),
      this.rabbitmqCheck.run(),
    ]);
    const names = ["mongodb", "freeswitch", "rabbitmq"];

    return settled.map((result, i) => {
      if (result.status === "fulfilled") {
        if (result.value.status !== "healthy") {
          this.logger.warn(`dependency check ${names[i]} -> ${result.value.status}: ${result.value.error}`);
        }
        return result.value;
      }

      this.logger.error(`dependency check ${names[i]} threw unexpectedly: ${result.reason?.message}`, result.reason?.stack);
      return {
        name: names[i],
        status: "unhealthy" as HealthStatus,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        detail: null,
        error: result.reason?.message || "check failed",
      };
    });
  }

  private deriveStatus(dependencies: DependencyCheckResult[]): HealthStatus {
    if (dependencies.some((d) => d.status === "unhealthy")) return "unhealthy";
    if (dependencies.some((d) => d.status === "degraded")) return "degraded";
    return "healthy";
  }
}
