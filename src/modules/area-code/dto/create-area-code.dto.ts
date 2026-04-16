import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, } from "class-validator";

export class CreateAreaCodeDto {

    @ApiProperty()
    @IsOptional()
    state_id: string

    @ApiProperty()
    @IsOptional()
    timezone_uuid: string

    @ApiProperty()
    @IsNotEmpty()
    code: string

    @ApiProperty()
    @IsNotEmpty()
    comment: string

    @ApiProperty()
    @IsNotEmpty()
    type: string

    @ApiProperty()
    @IsNotEmpty()
    start_time: String

    @ApiProperty()
    @IsNotEmpty()
    end_time: String
    
    @ApiProperty()
    @IsNotEmpty()
    day_light_toggle: String

    @ApiProperty()
    @IsUUID()
    tenant_uuid: string
}
