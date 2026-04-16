import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class UpdateFeatureCodeDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsNotEmpty()
    description : string

    @ApiProperty()
    @IsNotEmpty()
    feature_code : string

    @IsNotEmpty()
    tenant_uuid? : string
}