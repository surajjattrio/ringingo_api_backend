import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString } from "class-validator";

export class WebHookDto {

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "1"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsNotEmpty()
    web_hook_url: string

    @ApiProperty({description: '0 - All | 1 - Missed Call' , default : "1"})
    @IsNumberString()
    @IsIn(["0","1"])
    notify: string

    @IsNotEmpty()
    tenant_uuid : string
}
