import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

export class CreateManagerRoleDto {

    @ApiProperty()
    @IsNotEmpty()
    role_name : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsNotEmpty()
    advanced_roles : string

    @IsOptional()
    tenant_uuid : string
    
    module_permission?
}
