import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsArray } from "class-validator";

export class AssignExtensionDto {

    @ApiProperty()
    @IsNotEmpty()
    messaging_queue_extensions: string

    // @ApiProperty( { type: [ String ] } )
    // @IsArray()
    // @IsNotEmpty()
    // messaging_queue_extensions: string[];
}
