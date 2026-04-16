import { ApiProperty } from "@nestjs/swagger";
import { follow_me } from "../utils/extension-utils";

export class FollowMeDto {

    @ApiProperty({default : follow_me})
    follow_me : object
}