import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsString , IsOptional } from "class-validator";

let default_permission = { cc:500 , user : 100 };
let module_permission = { pbx : { rg : 10 , ivr : 5 } , call_center : { rg : 5 , ivr : 15 } }
export class CreateRolesDto {

    @ApiProperty()
    @IsNotEmpty()
    role_name : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

   // @ApiProperty({default : default_permission})
    @IsOptional()
    basic_roles : object


    @ApiProperty({default : module_permission})
    @IsNotEmpty()
    advanced_roles : string

    default_permission?
    module_permission?
}
