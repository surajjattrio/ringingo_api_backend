import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString } from "class-validator";

export class CreateInboundBlockCampaignDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsIn(["0","1"])
    @IsNumberString()
    type : string

    @ApiProperty()
    @IsNotEmpty()
    type_value : string

    @ApiProperty()
    @IsIn(["0","1"])
    @IsNumberString()
    status : string

    @IsNotEmpty()
    tenant_uuid : string
}
