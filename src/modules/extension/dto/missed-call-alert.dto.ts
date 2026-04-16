import { ApiProperty } from "@nestjs/swagger";
export class MissedCallAlertDto {

    @ApiProperty({description : "Send email when incoming calls were not able to answer" , default : ""})
    mail_to : string
}