import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class ArchiveFollowUpDto {

    @ApiProperty()
    @IsUUID()
    follow_up_uuid: string
}
