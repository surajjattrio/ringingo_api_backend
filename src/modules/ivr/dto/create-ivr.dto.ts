import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID,IsOptional , ValidateIf} from "class-validator";
import { ArrayExpression } from "mongoose";

let digits = [
    {
    "digits": "1",
    "routing_type": "3",
    "routing_options": "1232",
    }
]

export class CreateIvrDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsUUID()
    welcome_greetings_uuid : string

    @ApiProperty()
    @ValidateIf(val => val.invalid_greetings_uuid !== '')
    @IsUUID()
    invalid_greetings_uuid : string

    @ApiProperty()
    @IsNotEmpty()
    invalid_retries : string

    @ApiProperty()
    @ValidateIf(val => val.exit_greetings_uuid !== '')
    @IsUUID()
    exit_greetings_uuid : string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid : string

    @ApiProperty({ default: [] })
    @IsNotEmpty()
    digits: Object[];
    
    
    @ApiProperty()
    @IsUUID()
    tenant_uuid : string
    
    @IsOptional()
    domain : string

    @ApiProperty({default : "0"})
    @IsNumberString()
    timeout : string

    @IsOptional()
    uuid : string

    @IsOptional()
    @IsUUID()
    manager_uuid : string

    @IsOptional()
    role : string

    @IsOptional()
    is_csat : string

}
