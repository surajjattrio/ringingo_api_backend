import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CallerIdGroupImportDto {

    @ApiProperty()
    file : string
    
    @IsOptional()
    tenant_uuid : string

    @IsOptional()
    caller_id_group_uuid : string
}
