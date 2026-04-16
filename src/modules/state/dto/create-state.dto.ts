import { SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";
import { StateSchema } from "../schema/state.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";


export class CreateStateDto {

    @IsOptional()
    uuid: string

    @ApiProperty()
    @IsNotEmpty()
    state_name: string

    @ApiProperty()
    @IsNotEmpty()
    state_code: string

    @ApiProperty({ default: 0 })
    @IsNumberString()
    @IsIn(["0", "1"])
    toggle_status: string

    @ApiProperty()
    @IsOptional()
    tenant_uuid: string
}
let state_schema = SchemaFactory.createForClass(StateSchema)
state_schema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})