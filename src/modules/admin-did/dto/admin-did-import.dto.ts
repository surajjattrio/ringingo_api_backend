import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class AdminDidImportDto { 
    
    @IsOptional()
    uuid : string

    @IsOptional()
    tenant_uuid : string

    @ApiProperty()
    file : string

    @IsOptional()
    assign_tenant_uuid : string

    @IsOptional()
    role : string
}
