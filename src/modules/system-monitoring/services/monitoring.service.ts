import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { buildTargetRegistry } from "../config/monitoring-targets.config";
import { SelfHealthService } from "./self-health.service";
import { adaptLegacyHealth, isLegacyHealthShape } from "../adapters/legacy-health.adapter";
import { HealthStatus, MonitoringOverview, TargetHealthResult } from "../types/health.types";
import { MonitoringTarget } from "../types/monitoring-target.types";

const TARGET_TIMEOUT_MS = 3000;

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly selfHealth: SelfHealthService,
  ) {}

  private async checkTarget(target: MonitoringTarget): Promise<TargetHealthResult> {
    const base = { slug: target.slug, displayName: target.displayName, group: target.group, critical: target.critical };

    if (target.self) {
      try {
        const health = await this.selfHealth.build();
        this.logger.debug(`self check backend-api -> status=${health.status}`);
        return { ...base, reachable: true, error: null, health };
      } catch (err) {
        this.logger.error(`self check backend-api failed: ${err.message}`, err.stack);
        return { ...base, reachable: false, error: err.message || "self check failed", health: null };
      }
    }

    if (!target.url) {
      this.logger.debug(`monitoring target not configured: ${target.slug} (missing health URL env var)`);
      return { ...base, reachable: false, error: "not configured", health: null };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TARGET_TIMEOUT_MS);
    const start = Date.now();

    try {
      const response = await axios.get(target.url, {
        signal: controller.signal,
        timeout: TARGET_TIMEOUT_MS,
      });
      const health = isLegacyHealthShape(response.data)
        ? adaptLegacyHealth(response.data, target.slug)
        : response.data;
      this.logger.debug(
        `monitoring target reachable: ${target.slug} url=${target.url} latencyMs=${Date.now() - start} ` +
          `status=${health?.status}${health !== response.data ? " (adapted from legacy shape)" : ""}`,
      );
      return { ...base, reachable: true, error: null, health };
    } catch (err) {
      const statusCode = err.response?.status;
      const detail = statusCode ? `HTTP ${statusCode} ${JSON.stringify(err.response?.data)}` : err.message;
      this.logger.warn(`monitoring target unreachable: ${target.slug} url=${target.url} - ${detail}`);
      return { ...base, reachable: false, error: err.message || "request failed", health: null };
    } finally {
      clearTimeout(timeout);
    }
  }

  private targetSeverity(result: TargetHealthResult): number {
    if (!result.reachable) return result.critical ? 3 : 2;
    const status = result.health?.status;
    if (status === "unhealthy") return 3;
    if (status === "degraded") return 2;
    return 1;
  }

  async collectNow(): Promise<MonitoringOverview> {
    const start = Date.now();
    const targets = buildTargetRegistry(this.config);
    this.logger.debug(`collectNow starting fan-out to ${targets.length} targets: ${targets.map((t) => t.slug).join(", ")}`);

    const settled = await Promise.allSettled(targets.map((t) => this.checkTarget(t)));
    const results: TargetHealthResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;

      this.logger.error(`checkTarget threw unexpectedly for ${targets[i].slug}: ${s.reason?.message}`, s.reason?.stack);
      return {
        slug: targets[i].slug,
        displayName: targets[i].displayName,
        group: targets[i].group,
        critical: targets[i].critical,
        reachable: false,
        error: s.reason?.message || "check failed",
        health: null,
      };
    });

    const summary = { healthy: 0, degraded: 0, unhealthy: 0, unreachable: 0, total: results.length };
    for (const r of results) {
      if (!r.reachable) summary.unreachable++;
      else if (r.health?.status === "unhealthy") summary.unhealthy++;
      else if (r.health?.status === "degraded") summary.degraded++;
      else summary.healthy++;
    }

    const serversByKey = new Map<string, { hostname: string; ip: string; services: TargetHealthResult[] }>();
    targets.forEach((target, i) => {
      const key = `${target.server.hostname}|${target.server.ip}`;
      if (!serversByKey.has(key)) {
        serversByKey.set(key, { hostname: target.server.hostname, ip: target.server.ip, services: [] });
      }
      serversByKey.get(key).services.push(results[i]);
    });

    const severityToStatus: Record<number, HealthStatus> = { 1: "healthy", 2: "degraded", 3: "unhealthy" };
    const servers = Array.from(serversByKey.values()).map((server) => {
      const worst = Math.max(...server.services.map((s) => this.targetSeverity(s)));
      return { ...server, status: severityToStatus[worst] || "healthy" };
    });

    return {
      collectedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      summary,
      servers,
    };
  }
}
