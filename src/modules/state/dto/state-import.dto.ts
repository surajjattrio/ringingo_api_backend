import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class StateImportDto { 
    
    @ApiProperty()
    file : string

    @IsOptional()
    tenant_uuid : string
}
