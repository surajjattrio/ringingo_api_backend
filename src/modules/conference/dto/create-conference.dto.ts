import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID, Length, ValidateIf } from "class-validator";

export class CreateConferenceDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @ValidateIf(val => val.user_uuid != "")
    @IsUUID()
    user_uuid : string

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string

    @ApiProperty()
    @IsUUID()
    greeting_uuid : string

    @IsNotEmpty()
    tenant_uuid? : string

    @ApiProperty()
    @ValidateIf(val => val.pin != "")
    @Length(1, 10)
    @IsNumberString()
    pin : string

    // @ApiProperty({description : "0 - Normal | 1 - Schedule" , default : "0"})
    // @ValidateIf(val => val.type !== '')
    // @IsNumberString()
    // @IsIn(["0","1"])
    // type : string

    @ApiProperty({default : ""})
    conference_date? : string

    @ApiProperty({default : ""})
    @IsOptional()
    description : string

    @ApiProperty({default : ""})
   // @ValidateIf(val => val.email_address !== '')
    @IsOptional() 
    //@IsEmail()
    email_address? : string

    @ApiProperty({default : ""})
    @IsOptional()
    reminder_before ? : string

    @ApiProperty({default : ""})
    @IsOptional()
    reminder ? : string

    @ApiProperty({description : "0 - Sent | 1 - Not sent" , default : "1"})
    @IsOptional()
    reminder_sent_status ? : string

    @IsOptional()
    role : string
    
    @IsOptional()
    @IsUUID()
    manager_uuid : string

    // @ApiProperty({description : "0 - Enable | 1 - Disable" , default : "1"})
    // @IsNumberString()
    // @IsIn(["0","1"])
    // schedule_conf_status ? : string
}
