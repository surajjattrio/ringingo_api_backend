import { Controller, Get } from "@nestjs/common";
import { Public } from "src/global_constant";
import { SelfHealthService } from "../services/self-health.service";
import { HealthPayload } from "../types/health.types";

@Controller("internal")
export class InternalHealthController {
  constructor(private readonly selfHealth: SelfHealthService) {}

  @Public()
  @Get("health")
  async health(): Promise<HealthPayload> {
    return this.selfHealth.build();
  }
}
