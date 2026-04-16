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
}
