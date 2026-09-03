import { Injectable } from "@nestjs/common";
import { RabbitmqManagementService } from "../services/rabbitmq-management.service";
import { DependencyCheckResult } from "../types/health.types";

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class RabbitmqCheck {
  constructor(private readonly rabbitmq: RabbitmqManagementService) {}

  async run(): Promise<DependencyCheckResult> {
    const checkedAt = new Date().toISOString();
    const start = Date.now();

    try {
      const overview = await this.rabbitmq.getOverview(CHECK_TIMEOUT_MS);
      const latencyMs = Date.now() - start;

      return {
        name: "rabbitmq",
        status: "healthy",
        latencyMs,
        checkedAt,
        detail: {
          version: overview?.rabbitmq_version ?? null,
          queueTotals: overview?.queue_totals
            ? {
                messagesReady: overview.queue_totals.messages_ready,
                messagesUnacknowledged: overview.queue_totals.messages_unacknowledged,
              }
            : null,
        },
        error: null,
      };
    } catch (err) {
      return {
        name: "rabbitmq",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        detail: null,
        error: err.message || "rabbitmq check failed",
      };
    }
  }
}
