import { ApiProperty, OmitType } from "@nestjs/swagger";
import { CallOverviewDto } from "./call-overview.dto";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";

export class TenantCallOverviewDto extends OmitType(CallOverviewDto, ['by_tenant'] as const) {

    @ApiProperty()
    @ValidateIf(val => val.by_user !="")
    @IsUUID()
    by_user : string

    @IsOptional()
    direction : number
}
