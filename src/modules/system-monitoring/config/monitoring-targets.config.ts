import { ConfigService } from "@nestjs/config";
import { MonitoringTarget } from "../types/monitoring-target.types";

function serverFor(config: ConfigService, slug: string) {
  const prefix = `MONITORING_SERVER_${slug.toUpperCase().replace(/-/g, "_")}`;
  return {
    hostname: config.get<string>(`${prefix}_HOSTNAME`) || slug,
    ip: config.get<string>(`${prefix}_IP`) || "",
  };
}

export function buildTargetRegistry(config: ConfigService): MonitoringTarget[] {
  const definitions: Array<{
    slug: string;
    displayName: string;
    self?: boolean;
    urlEnv?: string;
    group: MonitoringTarget["group"];
    critical: boolean;
  }> = [
    { slug: "backend-api", displayName: "Backend API", self: true, group: "core", critical: true },
    { slug: "webhook-posting", displayName: "Webhook Posting (CDR Producer + Consumer)", urlEnv: "MONITORING_WEBHOOK_HEALTH_URL", group: "workers", critical: true },
  ];

  return definitions.map((def) => ({
    slug: def.slug,
    displayName: def.displayName,
    self: !!def.self,
    url: def.urlEnv ? config.get<string>(def.urlEnv) || null : null,
    server: serverFor(config, def.slug),
    group: def.group,
    critical: def.critical,
  }));
}
