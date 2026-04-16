import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsIn, IsInt, IsNegative, isNegative, IsNotEmpty, IsNumber, IsNumberString, IsPositive, IsString, IsUUID, Matches, Max, Min } from "class-validator";

export class ForwordingDidDto {

    @ApiProperty({description : "1 - Extension | 2 - IVR | 3 - Time-Condtion | 4 - Conference | 5 - Call Queue | 6 - Ring-Group | 7 - Voicemail|8 - PSTN" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1","2","3","4","5","6","7","8","9"])
    did_forwarding_type  : string

    @ApiProperty()
    @IsNotEmpty()   
    did_forwarding_value : string

}
