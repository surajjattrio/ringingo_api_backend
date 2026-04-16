import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

export class CreateDispositionDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty()
    @IsOptional()
    code: string

    @ApiProperty({ description: "0 - Active | 1 - Inactive", default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string

    @IsNotEmpty()
    tenant_uuid: string

    @IsNotEmpty()
    role: string

    @IsOptional()
    created_flag: string

    //new
    @IsOptional()
    parent_disposition: string

    @IsOptional()
    has_children: boolean

    @IsOptional()
    level: number

    @IsOptional()
    campaign_uuid: any

    @ApiProperty({ description: '0 - Enable | 1 - Disable', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    human_answer: string

    @ApiProperty({ description: '0 - Enable | 1 - Disable', default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    sale: string

    @ApiProperty({ description: '0 - Enable | 1 - Disable', default: "1" })
    @IsNumberString()
    @IsIn(["0", "1"])
    callback: string

}
