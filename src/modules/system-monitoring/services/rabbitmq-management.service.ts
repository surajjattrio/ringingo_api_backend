import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

const DEFAULT_MGMT_PORT = 15672;

@Injectable()
export class RabbitmqManagementService {
  constructor(private readonly config: ConfigService) {}

  private parseConnectionInfo() {
    const explicitBase = this.config.get<string>("RABBITMQ_MGMT_URL");
    const amqpUrl = this.config.get<string>("RABBITMQ_URL");
    if (!explicitBase && !amqpUrl) return null;

    let hostname = "";
    let username = "guest";
    let password = "guest";

    if (amqpUrl) {
      try {
        const parsed = new URL(amqpUrl);
        hostname = parsed.hostname;
        username = decodeURIComponent(parsed.username) || username;
        password = decodeURIComponent(parsed.password) || password;
      } catch {
        // fall through - explicitBase or env overrides may still be usable
      }
    }

    const port = this.config.get<string>("RABBITMQ_MGMT_PORT") || DEFAULT_MGMT_PORT;
    const baseUrl = explicitBase || `http://${hostname}:${port}`;
    const mgmtUser = this.config.get<string>("RABBITMQ_MGMT_USER") || username;
    const mgmtPass = this.config.get<string>("RABBITMQ_MGMT_PASSWORD") || password;

    return { baseUrl, auth: { username: mgmtUser, password: mgmtPass } };
  }

  async getOverview(timeoutMs: number) {
    const info = this.parseConnectionInfo();
    if (!info) throw new Error("RabbitMQ is not configured");

    const { data } = await axios.get(`${info.baseUrl}/api/overview`, {
      auth: info.auth,
      timeout: timeoutMs,
    });
    return data;
  }
}
