import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class DidImportDto { 
    
    @ApiProperty()
    @IsUUID()
    user_uuid : string

    @ApiProperty()
    file : string

    @IsOptional()
    tenant_uuid : string
}
