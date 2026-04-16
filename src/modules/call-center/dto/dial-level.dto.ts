import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString } from "class-validator";

export class DialLevelDto {
    
    @ApiProperty()
    @IsNumberString()
    current_dial_level: string

    @ApiProperty()
    @IsNumberString()
    target_drop_percent: string

    @ApiProperty()
    @IsNumberString()
    max_dial_level: string

    @ApiProperty()
    @IsNumberString()
    minimum_calls: string
}
