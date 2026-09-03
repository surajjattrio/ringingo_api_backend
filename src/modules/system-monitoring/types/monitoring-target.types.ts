export interface MonitoringTarget {
  slug: string;
  displayName: string;
  self: boolean;
  url: string | null;
  server: { hostname: string; ip: string };
  group: "core" | "workers";
  critical: boolean;
}
