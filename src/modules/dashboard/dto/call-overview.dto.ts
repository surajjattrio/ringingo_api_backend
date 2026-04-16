import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID, ValidateIf } from "class-validator";

export class CallOverviewDto{

    @ApiProperty()
    @ValidateIf(val => val.by_tenant !="")
    @IsUUID()
    by_tenant : string

    @ApiProperty()
    @IsNotEmpty()
    start_date : string

    @ApiProperty()
    @IsNotEmpty()
    end_date : string

    @IsNotEmpty()
    tenant_uuid : string

    @IsNotEmpty()
    role : string
}
