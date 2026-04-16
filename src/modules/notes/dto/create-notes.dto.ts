import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class CreateNotesDto {

    @ApiProperty()
    //@ValidateIf(val => val.cdrs_uuid !== "")
    //@IsUUID()
    @IsOptional()
    cdrs_uuid : string

    @ApiProperty()
    @ValidateIf(val => val.lead_uuid !== "")
    @IsUUID()
    lead_uuid : string

    @ApiProperty()
    @IsNotEmpty()
    comment : string

    @IsNotEmpty()
    tenant_uuid : string

    @IsOptional()
    uuid : string
    
    @IsOptional()
    user_uuid : string

}
