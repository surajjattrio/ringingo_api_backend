import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn , IsNotEmpty, IsNumberString , IsUUID , IsOptional } from "class-validator";


export class CreateAdminDidDto {

    @ApiProperty()
    @IsNumberString()
    number : string

    @ApiProperty()
    @IsOptional()
    codec : string

    @ApiProperty({default : "0"})
    @IsOptional()
    timeout : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsOptional()
   // @IsUUID()
    assign_tenant_uuid : string
    
    
      @IsOptional()
    created_flag :string
    
}

