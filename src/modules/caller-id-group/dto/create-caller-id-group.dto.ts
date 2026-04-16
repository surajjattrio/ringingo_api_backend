import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID } from "class-validator";

export class CreateCallerIdGroupDto {

    @ApiProperty()
    @IsNotEmpty()
    caller_id_group : string

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string
    
    @IsNotEmpty()
    tenant_uuid : string

    @IsOptional()
    caller_id : string

    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @IsOptional()
    role : string
}
