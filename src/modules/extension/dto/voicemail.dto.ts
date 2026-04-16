import { ApiProperty } from "@nestjs/swagger";
import { voicemail } from "../utils/extension-utils";

export class VoicemailDto {

    @ApiProperty({default : voicemail})
    voicemail : object
}