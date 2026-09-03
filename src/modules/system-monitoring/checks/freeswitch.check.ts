import { Injectable } from "@nestjs/common";
import { Mutex } from "async-mutex";
import { CommonFunctions } from "src/modules/common/common_functions";
import { DependencyCheckResult } from "../types/health.types";

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class FreeswitchCheck {
  private readonly mutex = new Mutex();

  constructor(private readonly commonFn: CommonFunctions) {}

  async run(): Promise<DependencyCheckResult> {
    // Serializes concurrent Refresh clicks so they don't fire overlapping ESL commands
    // on the shared connection used by the rest of the app.
    return this.mutex.runExclusive(() => this.check());
  }

  private async check(): Promise<DependencyCheckResult> {
    const checkedAt = new Date().toISOString();
    const start = Date.now();

    const conn = this.commonFn.fetchFsConnection();
    if (!conn || typeof conn.api !== "function") {
      return {
        name: "freeswitch",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        detail: null,
        error: "FreeSWITCH connection not initialized",
      };
    }

    if (typeof conn.connected === "function" && !conn.connected()) {
      return {
        name: "freeswitch",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        detail: null,
        error: "FreeSWITCH ESL socket not connected",
      };
    }

    try {
      const body = await this.withTimeout(
        new Promise<string>((resolve, reject) => {
          try {
            conn.api("status", (res: any) => resolve(res?.getBody?.() ?? ""));
          } catch (err) {
            reject(err);
          }
        }),
      );
      const latencyMs = Date.now() - start;

      if (body === "FS disabled") {
        return {
          name: "freeswitch",
          status: "unhealthy",
          latencyMs,
          checkedAt,
          detail: null,
          error: "FreeSWITCH integration disabled (ENABLE_FS != true)",
        };
      }

      const sessionsMatch = body.match(/(\d+)\s+session\(s\)\s+since\s+startup/i);
      const upMatch = body.match(/UP\s+([^\n]+)/i);

      return {
        name: "freeswitch",
        status: "healthy",
        latencyMs,
        checkedAt,
        detail: {
          up: upMatch ? upMatch[1].trim() : null,
          sessionsSinceStartup: sessionsMatch ? Number(sessionsMatch[1]) : null,
        },
        error: null,
      };
    } catch (err) {
      return {
        name: "freeswitch",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        detail: null,
        error: err.message || "freeswitch check failed",
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("freeswitch check timed out")), CHECK_TIMEOUT_MS);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }
}
