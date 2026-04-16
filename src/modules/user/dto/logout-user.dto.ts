import { ApiProperty } from "@nestjs/swagger";
import { IsFQDN, IsNotEmpty} from "class-validator";

export class LogoutUserDto {
    
    @ApiProperty()
    @IsNotEmpty()
    username : string

    @ApiProperty()
    @IsFQDN()
    domain : string
}
