import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID , IsOptional , ValidateIf } from "class-validator";
import { ArrayExpression } from "mongoose";

let agent_info = [
    {
        "name" : "",
        "status" : 0,
        "extension_uuid" : "",
        "level" : "",
        "position" : "",
	"user_uuid" : ""
    }
]

export class CreateCallQueueDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty({ default: "0" })
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string
    
    @ApiProperty()
    @IsOptional()
    sticky_agent : string

    @ApiProperty({ default: "ring-all" })
    @IsNotEmpty()
//    @IsIn(["ring-all", "longest-idle-agent", "round-robin", "top-down", "agent-with-least-talk-time", "agent-with-fewest-calls", "sequentially-by-agent-order", "random", "ring-progressively"])
    strategy: string

    @IsNotEmpty()
    @IsUUID()
    tenant_uuid : string

    @ApiProperty({ description: 'You need to add uuid from user table for that particular user' })
    @ValidateIf(val => val.user_uuid !== '')
    @IsUUID()
    user_uuid: string

    @ApiProperty()
    @ValidateIf(val => val.timeout !== '')
    @IsNumberString()
    timeout : string

    @ApiProperty()
    @ValidateIf(val => val.agent_timeout !== '')
    @IsNumberString()
    agent_timeout : string

    @ApiProperty({ description: 'You need to add uuid from greeting table for that particular greeting' })
    @IsOptional()
    call_waiting_greeting_uuid: string

    @ApiProperty({ description: 'You need to add uuid from greeting table for that particular greeting' })
    @IsOptional()
    call_welcome_greeting_uuid: string

    @ApiProperty({default : agent_info})
    @IsOptional()
    agent_info: ArrayExpression

    @ApiProperty({description : "0 - Pbx | 1 - Call Centre"})
    @IsNumberString()
    @IsIn(["0", "1"])
    for_pbx: string
   
    @IsOptional()
    domain : string	

    @IsOptional()
    role : string
    
    @IsOptional()
    @IsUUID()
    manager_uuid : string
}
