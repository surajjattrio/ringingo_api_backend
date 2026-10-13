import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";
import { ArrayExpression } from "mongoose";
import { outgoingRules } from "../utils/outgoing-rules-utils";


export class CreateOutgoingRulesDto {

    @ApiProperty()
    @IsNotEmpty()
    name : string

    @ApiProperty()
    @IsOptional()
    description : string

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status: string

    @IsNotEmpty()
    tenant_uuid : string
    
    @ApiProperty({default : outgoingRules})
    @IsNotEmpty()
    rules : ArrayExpression

    @IsOptional()
    created_flag? : string

    @IsOptional()
    role? : string

    @ApiProperty({ description : "prefix - Prefix based rows | cli - Route by caller id", default : "prefix" })
    @IsOptional()
    @IsIn(["prefix","cli"])
    route_type? : string

    @ApiProperty({ description : "CLI route, no CLI selected : first - first CLI | round_robin - CLIs in turn", default : "first" })
    @IsOptional()
    @IsIn(["first","round_robin"])
    no_cli_mode? : string
}
