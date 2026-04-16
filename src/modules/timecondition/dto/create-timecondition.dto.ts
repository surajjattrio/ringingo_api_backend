import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty,IsNumberString , IsUUID , ValidateIf } from "class-validator";
import { ArrayExpression } from "mongoose";
let condition = [
    {
        "start_hour": "02",
        "start_minute": "00",
        "end_hour": "23",
        "end_minute": "59",
        "weekday_start": "0",
        "weekday_end": "6",
        "monthday_start": "01",
        "monthday_end": "31",
        "start_month": "1",
        "end_month": "12",
        "start_year": "2023",
        "end_year": "2023",
        "extension_calltype": "0",
        "extension_destination": "123456",
        "priority": "1"
    }
]

export class CreateTimeconditionDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status: string

    @IsNotEmpty()
    tenant_uuid: string

    @ApiProperty({ description : "You need to add uuid of user in which you need to add this timecondition" })
    @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid: string

    @ApiProperty({ default: '0' })
    @IsNotEmpty()
    failover_routing_type: string

    @ApiProperty({ default: '12345' })
    @IsNotEmpty()
    failover_routing_options: string


    @ApiProperty({ default: condition})
    @IsNotEmpty()
    condition: ArrayExpression
   
    @IsNotEmpty()
    fail_over_routing_name : string
}
