export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface DiskUsage {
  mount: string;
  totalGb: number;
  usedGb: number;
  usedPercent: number;
}

export interface ProcessMetrics {
  pid: number;
  cpuPercent: number;
  memoryRssMb: number;
  heapUsedMb?: number;
  restartCount: number | null;
  eventLoopLagMs?: number;
}

export interface SystemMetrics {
  cpuPercent: number;
  loadAvg: [number, number, number];
  cpuCores: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryPercent: number;
  swapUsedMb: number;
  disks: DiskUsage[];
}

export interface DependencyCheckResult {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  checkedAt: string;
  detail: Record<string, unknown> | null;
  error: string | null;
}

export interface HealthPayload {
  schemaVersion: 1;
  service: string;
  instance: string;
  server: { hostname: string; ip: string; env: string };
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: { commit: string | null; buildTime: string | null };
  process: ProcessMetrics;
  system?: SystemMetrics;
  dependencies: DependencyCheckResult[];
}

export interface TargetHealthResult {
  slug: string;
  displayName: string;
  group: string;
  critical: boolean;
  reachable: boolean;
  error: string | null;
  health: HealthPayload | null;
}

export interface MonitoringOverview {
  collectedAt: string;
  durationMs: number;
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    unreachable: number;
    total: number;
  };
  servers: Array<{
    hostname: string;
    ip: string;
    status: HealthStatus;
    services: TargetHealthResult[];
  }>;
}
