import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsStrongPassword, IsUUID  , IsOptional , ValidateIf} from "class-validator";
export class CreateExtensionDto {

    @ApiProperty()
    @IsNotEmpty()
    device_name : string

    @ApiProperty()
    @IsNotEmpty()
    username : string

    @ApiProperty({description : "Password should contains total 8 characters (one small letter , one capital letter , one special character, one numeric) Example : Test@123"})
    @IsStrongPassword()
    password : string

    @ApiProperty({description : "You need to provide uuid of user in which you need to add this extension"})
    @IsUUID()
    user_uuid : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsOptional()
    caller_id_name : string

    @ApiProperty()
    @ValidateIf(val => val.caller_id_number !== '')
    @IsNumberString()
    caller_id_number : number

    @IsNotEmpty()
    tenant_uuid : string
    
    @IsOptional()
    extension_status : String

    @IsOptional()
    role : string

    @IsOptional()
    parent_uuid : string
}
