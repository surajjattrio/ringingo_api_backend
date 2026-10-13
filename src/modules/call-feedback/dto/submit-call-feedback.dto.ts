import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitCallFeedbackDto {

    @ApiProperty()
    @IsNumber()
    rating: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    comment?: string;
}
