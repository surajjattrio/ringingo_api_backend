import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCtcDto {

    @ApiProperty({ description: "Extension username when agent_type=extension, or the number to dial out on the trunk when agent_type=trunk" })
    @IsNotEmpty()
    agent_number: string

    @ApiProperty({ description: "extension | trunk" })
    @IsIn(["extension", "trunk"])
    agent_type: string

    @ApiProperty({ description: "Trunk uuid - required when agent_type=trunk" })
    @IsOptional()
    agent_trunk: string

    @ApiProperty()
    @IsOptional()
    agent_caller_id: string

    @ApiProperty()
    @IsNotEmpty()
    customer_number: string

    @ApiProperty({ description: "Optional trunk uuid to dial the customer out on. Omit to use the tenant's own Outgoing Rules." })
    @IsOptional()
    customer_trunk: string

    @ApiProperty()
    @IsOptional()
    customer_type: string

    @ApiProperty()
    @IsOptional()
    customer_caller_id: string

    @ApiProperty({ description: "agent | customer - who is dialled first", default: "agent" })
    @IsOptional()
    @IsIn(["agent", "customer"])
    callfirst: string

    @ApiProperty({ description: "Ring timeout in seconds", default: 40 })
    @IsOptional()
    timeout: number

    @ApiProperty({ description: "1 = auto-answer on the agent's extension (no manual click needed) - only applies when agent_type=extension", default: 0 })
    @IsOptional()
    auto_answer: number

    // ---- auto-injected by SetUUIDInterceptor from the caller's JWT ----
    // (declared here only so the whitelist-only ValidationPipe does not strip them)
    @IsOptional()
    tenant_uuid: string

    @IsOptional()
    role: string

    @IsOptional()
    domain: string

    @IsOptional()
    manager_uuid: string
}
