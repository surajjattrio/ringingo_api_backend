import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsStrongPassword, IsUUID, ValidateIf } from "class-validator";

export class CreateTrunkDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsUUID()
    sip_profile_uuid : string

    @ApiProperty()
    @IsOptional()
    username : string

    @ApiProperty({description : "Password should contains total 8 characters (one small letter , one capital letter , one special character, one numeric) Example : Test@123"})
    @ValidateIf(val => val.password !== "")
    password : string

    @ApiProperty()
    // @IsFQDN()
    @IsNotEmpty()
    domain : string

    @ApiProperty()
    @IsOptional()
    outbound_proxy : string

    @ApiProperty({description: '0 - Enable | 1 - Disable' , default : "1"})
    @ValidateIf(val => val.register !== "")
    @IsNumberString()
    @IsIn(["0","1"])
    register : string

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsOptional()
    from_domain : string

    @ApiProperty()
    @IsOptional()
    from_user : string

    @ApiProperty()
    @IsOptional()
    realm : string

    @ApiProperty({default : "0" , description : "0 - True | 1 - false"})
    @ValidateIf(val => val.extension_in_contact !== "")
    @IsIn(["0","1"])
    extension_in_contact : string

    @ApiProperty()
    @IsOptional()
    extension : string

    @ApiProperty()
    @ValidateIf(val => val.expire_seconds !== '')
    @IsNumberString()
    expire_seconds : string

    @ApiProperty()
    @IsOptional()
    reg_transport : string

    @ApiProperty()
    @IsOptional()
    contact_params : string

    @ApiProperty()
    @ValidateIf(val => val.ping !== '')
    @IsNumberString()
    ping : string

    @ApiProperty()
    @ValidateIf(val => val.retry_seconds !== '')
    @IsNumberString()
    retry_seconds : string

    @ApiProperty()
    @IsOptional()
    register_proxy : string

    @ApiProperty()
    @IsOptional()
    dialplan_variable : string

    @IsNotEmpty()
    tenant_uuid : string

    @IsOptional()
    created_flag :string

    @IsOptional()
    register_flag: string

    @IsOptional()
    role : string

    @IsOptional()
    parent_uuid : string
}
