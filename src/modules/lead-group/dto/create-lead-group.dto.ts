import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class CreateLeadGroupDto {

    @ApiProperty()
    @ValidateIf(val => val.user_group_uuid !="")
    @IsUUID()
    user_group_uuid : string

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsOptional()
    description : string

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsOptional()
   // @IsNumberString()
    //@IsIn(["0","1"])
    status : string

    @ApiProperty()
    @ValidateIf(val => val.campaign_uuid !="")
    @IsUUID()
    campaign_uuid : string

    @IsNotEmpty()
    tenant_uuid : string

    @ApiProperty( { default: "0" } )
    @IsNumberString()
    @IsOptional()
    totalLeadCount: string

    @IsOptional()
    role : string
    
    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @ApiProperty( { default: "0" } )
    @IsNumberString()
    @IsOptional()
    human_answer : string

    @ApiProperty( { default: "0" } )
    @IsNumberString()
    @IsOptional()
    sale : string

    @IsOptional()
    campaign_flag : string

    @IsOptional()
    webhook: boolean
}
