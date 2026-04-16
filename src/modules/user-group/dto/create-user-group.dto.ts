import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty,IsOptional, IsNumberString, IsUUID } from "class-validator";

export class CreateUserGroupDto {
    
    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsUUID()
    outbound_rule : string

    @ApiProperty({ default: "0" , description: '0 - Active | 1 - Inactive'})
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string

    /*@ApiProperty()
    @IsNotEmpty()
    user_uuid : any*/

    @IsNotEmpty()
    tenant_uuid : string

    @IsOptional()
    manager_uuid:string

    @IsOptional()
    role:string
}
