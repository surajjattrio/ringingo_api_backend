import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class AreaCodeImportDto {

    @ApiProperty()
    file: string

    @ApiProperty()
    @IsUUID()
    state_id: string

    @IsOptional()
    tenant_uuid: string
}
