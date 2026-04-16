import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";

export class CreateWebformDto {

    @ApiProperty()
    @IsOptional()
    name : string


    @ApiProperty()
    @IsOptional()
    description : string


    @ApiProperty()
    @IsOptional()
    url : string


    @ApiProperty()
    @IsUUID()
    tenant_uuid : string



}
