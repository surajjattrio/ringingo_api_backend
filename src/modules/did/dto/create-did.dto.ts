import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";

export class CreateDidDto {

    @ApiProperty()
    @IsNumberString()
    number : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid : string

    @ApiProperty()
    @IsOptional()
    codec : string

    @ApiProperty({default : "0"})
    @IsOptional()
    timeout : string

    @IsOptional()
    role : string
    
    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @ApiProperty()
    @IsUUID()
    tenant_uuid : string

    @ApiProperty({description : "0 - Enable | 1 - Disable" , default : "1"})
    @IsNumberString()
    @IsIn(["0","1"])
    did_as_cid : string

}
