import { OmitType } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { CreateTrunkDto } from "./create-trunk.dto";

export class TenantTrunkDto extends OmitType(CreateTrunkDto, ['sip_profile_uuid'] as const) {

    @IsOptional()
    sip_profile_uuid : String
}

