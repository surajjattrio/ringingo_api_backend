import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";

export class CreateDncDto {

    @ApiProperty()
    @IsOptional()
    name : string


    @ApiProperty()
    @IsNumberString()
    phone_number : string


    @ApiProperty()
    @IsOptional()
    campaign_uuid : string


    @ApiProperty()
    @IsOptional()
    concurrent_cam : string


    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string


    @ApiProperty()
    @ValidateIf(val => val.global_status !="")
    @IsIn(["0","1"])
    global_status : string


    @ApiProperty()
    @IsUUID()
    tenant_uuid : string



}
