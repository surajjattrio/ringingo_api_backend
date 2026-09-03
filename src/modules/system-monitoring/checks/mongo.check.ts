import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { DependencyCheckResult } from "../types/health.types";

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class MongoCheck {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<DependencyCheckResult> {
    const checkedAt = new Date().toISOString();
    const start = Date.now();

    try {
      await this.withTimeout(this.connection.db.admin().command({ ping: 1 }));
      const latencyMs = Date.now() - start;

      const detail: Record<string, unknown> = { readyState: this.connection.readyState };
      try {
        const status: any = await this.withTimeout(this.connection.db.admin().serverStatus());
        if (status?.connections) {
          detail.poolCurrent = status.connections.current;
          detail.poolAvailable = status.connections.available;
        }
      } catch {
        // serverStatus may be restricted for this DB user - ping already proved reachability.
      }

      return { name: "mongodb", status: "healthy", latencyMs, checkedAt, detail, error: null };
    } catch (err) {
      return {
        name: "mongodb",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        detail: { readyState: this.connection.readyState },
        error: err.message || "mongo ping failed",
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("mongo check timed out")), CHECK_TIMEOUT_MS);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }
}
