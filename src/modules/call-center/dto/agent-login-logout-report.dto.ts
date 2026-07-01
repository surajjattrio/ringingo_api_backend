import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumberString, IsOptional } from "class-validator";

export class AgentLoginLogoutReportDto {

    @IsOptional()
    agent_uuid: string

    @IsOptional()
    uuid: string

    @IsOptional()
    tenant_uuid : string

    @IsOptional()
    createdAt : any

    @ApiProperty({description: '0 - Logged in | 1 - On break | 2 - Logged out | 3 - Pause Start | 4 - Pause End | 5 - ACW Start | 6 - ACW End'  , default : "0"})
    @IsNumberString()
    @IsIn(["0","1","2","3","4","5","6"])
    login_status : string

    @IsOptional()
    date : string

    @IsOptional()
    date_time : string

    @IsOptional()
    breakcode_uuid : string

    @IsOptional()
    campaign_uuid: string
}
