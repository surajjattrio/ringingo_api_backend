import { ApiProperty } from "@nestjs/swagger";
import { speed_dial } from "../utils/extension-utils";

export class SpeedDialDto {

    @ApiProperty({default : speed_dial})
    speed_dial : object
}