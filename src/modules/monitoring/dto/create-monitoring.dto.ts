import { ApiProperty } from "@nestjs/swagger";
import { IsIP, IsNotEmpty, IsOptional , IsNumberString , IsIn , IsUUID } from "class-validator";

export class CreateMonitoringDto {
 

    @ApiProperty()
    @IsOptional()
    extension : string

    @ApiProperty()
    @IsOptional()
    call_uuid : string


    @ApiProperty()
    @IsOptional()
    domain : string



}
