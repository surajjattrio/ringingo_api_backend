import { OmitType } from "@nestjs/swagger";
import { CreateLeadManagementDto } from "./create-lead-management.dto";
import { IsOptional } from "class-validator";

export class AgentLeadManagementDto extends OmitType(CreateLeadManagementDto, ['user_uuid'] as const) {

    @IsOptional()
    user_uuid : string
}
