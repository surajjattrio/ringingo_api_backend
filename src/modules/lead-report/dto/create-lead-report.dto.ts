import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , ValidateIf , IsOptional } from "class-validator";

export class CreateLeadreportDto {


    @ApiProperty()
    // @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid : string

    @ApiProperty()
     lead_group_uuid: string

     @ApiProperty()
     disposition_uuid: string
 
     @ApiProperty()
     count: string
 
    @ApiProperty({default : "0"})
    @IsOptional()
    called_count : string
}
