import { ApiProperty } from "@nestjs/swagger";
import { IsOptional,IsNotEmpty} from "class-validator";

export class FtpDto {

    @ApiProperty()
    @IsOptional()
    host : string

    @ApiProperty()
    @IsOptional()
    port : number

    @ApiProperty()
    @IsOptional()
    username : string

    @ApiProperty()
    @IsOptional()
    password : string

    @ApiProperty()
    @IsOptional()
    path : string

    @ApiProperty()
    @IsOptional()
    protocol : string

    @ApiProperty()
    @IsOptional()
    secure : string

    @ApiProperty()
    @IsOptional()
    delete_before_days_file : string

    @ApiProperty()
    @IsOptional()
    status : string

    @IsNotEmpty()
    tenant_uuid : string

}

