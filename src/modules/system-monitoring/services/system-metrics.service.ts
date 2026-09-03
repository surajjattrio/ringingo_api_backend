import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as os from "os";
import * as fsPromises from "fs/promises";
import { DiskUsage, ProcessMetrics, SystemMetrics } from "../types/health.types";

// @types/node in this repo predates the `statfs` typing (runtime support since Node 18.15).
const statfs: (path: string) => Promise<{ blocks: number; bfree: number; bsize: number }> =
  (fsPromises as any).statfs;

const CPU_SAMPLE_MS = 200;

function readCpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

@Injectable()
export class SystemMetricsService {
  constructor(private readonly config: ConfigService) {}

  private getDiskMounts(): string[] {
    const raw = this.config.get<string>("MONITORING_DISK_MOUNTS");
    if (!raw) return ["/"];
    return raw.split(",").map((m) => m.trim()).filter(Boolean);
  }

  async getSystemCpuPercent(): Promise<number> {
    const before = readCpuTimes();
    await new Promise((resolve) => setTimeout(resolve, CPU_SAMPLE_MS));
    const after = readCpuTimes();

    const idleDelta = after.idle - before.idle;
    const totalDelta = after.total - before.total;
    if (totalDelta <= 0) return 0;

    const percent = (1 - idleDelta / totalDelta) * 100;
    return Math.round(percent * 10) / 10;
  }

  async getProcessCpuPercent(): Promise<number> {
    const before = process.cpuUsage();
    const beforeAt = process.hrtime.bigint();
    await new Promise((resolve) => setTimeout(resolve, CPU_SAMPLE_MS));
    const delta = process.cpuUsage(before);
    const elapsedMs = Number(process.hrtime.bigint() - beforeAt) / 1e6;

    const cpuMs = (delta.user + delta.system) / 1000;
    if (elapsedMs <= 0) return 0;
    const percent = (cpuMs / elapsedMs) * 100;
    return Math.round(percent * 10) / 10;
  }

  async getEventLoopLagMs(): Promise<number> {
    const start = process.hrtime.bigint();
    await new Promise((resolve) => setImmediate(resolve));
    const lagMs = Number(process.hrtime.bigint() - start) / 1e6;
    return Math.round(lagMs * 10) / 10;
  }

  async getDisks(): Promise<DiskUsage[]> {
    const mounts = this.getDiskMounts();
    const results = await Promise.allSettled(
      mounts.map(async (mount): Promise<DiskUsage> => {
        const stats = await statfs(mount);
        const totalBytes = stats.blocks * stats.bsize;
        const freeBytes = stats.bfree * stats.bsize;
        const usedBytes = totalBytes - freeBytes;
        const totalGb = totalBytes / 1024 ** 3;
        const usedGb = usedBytes / 1024 ** 3;
        return {
          mount,
          totalGb: Math.round(totalGb * 10) / 10,
          usedGb: Math.round(usedGb * 10) / 10,
          usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
        };
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<DiskUsage> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  getMemory() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    return {
      memoryTotalMb: Math.round(totalBytes / 1024 ** 2),
      memoryUsedMb: Math.round(usedBytes / 1024 ** 2),
      memoryPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
    };
  }

  async collectProcessMetrics(): Promise<ProcessMetrics> {
    const [cpuPercent, eventLoopLagMs] = await Promise.all([
      this.getProcessCpuPercent(),
      this.getEventLoopLagMs(),
    ]);
    const mem = process.memoryUsage();

    return {
      pid: process.pid,
      cpuPercent,
      memoryRssMb: Math.round((mem.rss / 1024 ** 2) * 10) / 10,
      heapUsedMb: Math.round((mem.heapUsed / 1024 ** 2) * 10) / 10,
      restartCount: null,
      eventLoopLagMs,
    };
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const [cpuPercent, disks] = await Promise.all([this.getSystemCpuPercent(), this.getDisks()]);
    const mem = this.getMemory();

    return {
      cpuPercent,
      loadAvg: os.loadavg() as [number, number, number],
      cpuCores: os.cpus().length,
      memoryTotalMb: mem.memoryTotalMb,
      memoryUsedMb: mem.memoryUsedMb,
      memoryPercent: mem.memoryPercent,
      swapUsedMb: 0,
      disks,
    };
  }
}
