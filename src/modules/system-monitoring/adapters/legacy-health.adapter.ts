import { DependencyCheckResult, HealthPayload, HealthStatus } from "../types/health.types";

/**
 * Some workers (e.g. cdr-producer's /api/health) predate the schemaVersion-1
 * contract and return { status, timestamp, uptime, services: {...} } instead.
 * Detect that shape and normalize it into a HealthPayload so the monitoring
 * page can still render it - CPU/memory/disk aren't available from this shape,
 * so `system` is omitted entirely rather than fabricated as misleading zeros.
 * Once a target starts returning a real schemaVersion-1 payload,
 * isLegacyHealthShape() returns false and this adapter is skipped automatically.
 */
export function isLegacyHealthShape(raw: any): boolean {
  return !!raw && typeof raw.schemaVersion !== "number" && typeof raw.services === "object";
}

function mapConnectionStatus(status: string): HealthStatus {
  return status === "connected" || status === "ok" ? "healthy" : "unhealthy";
}

export function adaptLegacyHealth(raw: any, slug: string): HealthPayload {
  const dependencies: DependencyCheckResult[] = [];
  const checkedAt = raw.timestamp || new Date().toISOString();

  const mongodb = raw.services?.mongodb;
  if (mongodb) {
    dependencies.push({
      name: "mongodb",
      status: mapConnectionStatus(mongodb.status),
      latencyMs: null,
      checkedAt,
      detail: { database: mongodb.database ?? null, collections: mongodb.collections ?? null },
      error: mongodb.error || null,
    });
  }

  const rabbitmq = raw.services?.rabbitmq;
  if (rabbitmq) {
    const status: HealthStatus =
      rabbitmq.status !== "connected" ? "unhealthy" : rabbitmq.consumers?.allActive === false ? "degraded" : "healthy";
    dependencies.push({
      name: "rabbitmq",
      status,
      latencyMs: null,
      checkedAt,
      detail: {
        mainQueueMessages: rabbitmq.mainQueue?.messages ?? null,
        deadLetterQueueMessages: rabbitmq.deadLetterQueue?.messages ?? null,
        consumers: rabbitmq.consumers ?? null,
      },
      error: rabbitmq.error || (rabbitmq.warnings?.length ? rabbitmq.warnings.join("; ") : null),
    });
  }

  const status: HealthStatus = dependencies.some((d) => d.status === "unhealthy")
    ? "unhealthy"
    : dependencies.some((d) => d.status === "degraded")
      ? "degraded"
      : "healthy";

  return {
    schemaVersion: 1,
    service: slug,
    instance: `${slug}@legacy-api-health`,
    server: { hostname: "", ip: "", env: "unknown" },
    status,
    timestamp: checkedAt,
    uptimeSeconds: Math.round(raw.uptime || 0),
    version: { commit: null, buildTime: null },
    process: { pid: 0, cpuPercent: 0, memoryRssMb: 0, restartCount: null },
    dependencies,
  };
}
