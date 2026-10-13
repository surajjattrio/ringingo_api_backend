import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsArray, IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";

/* ────────────────── STAGE DTO ────────────────── */
export class CreatePipelineStageDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ default: "#342df2" })
    @IsOptional()
    color: string;

    @IsNotEmpty()
    tenant_uuid: string;

    @ApiProperty({ description: "0 - Active | 1 - Inactive", default: "0" })
    @IsOptional()
    @IsNumberString()
    @IsIn(["0", "1"])
    status: string;

    @IsOptional()
    sort_order: number;
}

export class UpdatePipelineStageDto extends PartialType(CreatePipelineStageDto) {}

/* ────────────────── LEAD DTO ────────────────── */
export class CreatePipelineLeadDto {

    @ApiProperty()
    @IsNotEmpty()
    stage_uuid: string;

    @IsNotEmpty()
    tenant_uuid: string;

    @ApiProperty()
    @IsNotEmpty()
    phone: string;

    @ApiProperty()
    @IsOptional()
    name: string;

    @ApiProperty()
    @IsOptional()
    email: string;

    @ApiProperty({ description: "High | Medium | Low", default: "Medium" })
    @IsOptional()
    @IsIn(["High", "Medium", "Low"])
    priority: string;

    @ApiProperty()
    @IsOptional()
    value: string;

    @ApiProperty()
    @IsOptional()
    tags: string[];

    @ApiProperty()
    @IsOptional()
    campaign_name: string;

    @ApiProperty()
    @IsOptional()
    campaign_uuid: string;

    @ApiProperty()
    @IsOptional()
    lead_group_name: string;

    @ApiProperty()
    @IsOptional()
    lead_group_uuid: string;

    @ApiProperty()
    @IsOptional()
    user_name: string;

    @ApiProperty()
    @IsOptional()
    user_uuid: string;

    @ApiProperty()
    @IsOptional()
    lead_management_uuid: string;

    @IsOptional()
    status: string;
}

export class UpdatePipelineLeadDto extends PartialType(CreatePipelineLeadDto) {}

/* ────────────────── IMPORT LEADS DTO ────────────────── */
export class ImportPipelineLeadsDto {

    @ApiProperty()
    @IsNotEmpty()
    tenant_uuid: string;

    @ApiProperty({ required: false, description: "Optional lead group UUID. If omitted, imports from all groups in lead management." })
    @IsOptional()
    lead_group_uuid?: string;

    @ApiProperty({ type: [String] })
    @IsNotEmpty()
    disposition_uuids: string[];
}

/* ────────────────── ASSIGNMENT CONFIG DTO ────────────────── */
export class AssignmentConfigUserDto {
    @ApiProperty()
    @IsNotEmpty()
    user_uuid: string;

    @ApiProperty()
    @IsOptional()
    user_name: string;

    @ApiProperty({ description: "How many consecutive leads this user receives before rotating (1-100)", default: 1 })
    @IsOptional()
    frequency: number;
}

export class UpsertAssignmentConfigDto {
    @IsNotEmpty()
    tenant_uuid: string;

    @ApiProperty({ description: "Enable or disable auto-assign round robin", default: false })
    @IsOptional()
    enabled: boolean;

    @ApiProperty({ type: [AssignmentConfigUserDto] })
    @IsOptional()
    users: AssignmentConfigUserDto[];

    @ApiProperty({ description: "Enable auto lead import from Lead Management", default: false })
    @IsOptional()
    auto_import?: boolean;

    @ApiProperty({ description: "Disposition UUIDs to watch when auto_import is enabled", type: [String] })
    @IsOptional()
    @IsArray()
    auto_import_dispositions?: string[];
}

export class DistributeExistingLeadsDto {
    @ApiProperty({ description: "Tenant UUID" })
    @IsNotEmpty()
    @IsString()
    tenant_uuid: string;
}

export class BulkDeletePipelineLeadsDto {
    @ApiProperty({ description: "Array of lead UUIDs to bulk delete", type: [String] })
    @IsArray()
    @IsNotEmpty()
    lead_uuids: string[];
}

export class BulkUpdatePipelineLeadsDto {
    @ApiProperty({ description: "Array of lead UUIDs to bulk update", type: [String] })
    @IsArray()
    @IsNotEmpty()
    lead_uuids: string[];

    @ApiProperty({ required: false, description: "Campaign UUID to assign to selected leads" })
    @IsOptional()
    @IsString()
    campaign_uuid?: string;

    @ApiProperty({ required: false, description: "Campaign Name" })
    @IsOptional()
    @IsString()
    campaign_name?: string;

    @ApiProperty({ required: false, description: "Lead Group UUID to assign to selected leads" })
    @IsOptional()
    @IsString()
    lead_group_uuid?: string;

    @ApiProperty({ required: false, description: "Lead Group Name" })
    @IsOptional()
    @IsString()
    lead_group_name?: string;

    @ApiProperty({ required: false, description: "User UUID to assign to selected leads" })
    @IsOptional()
    @IsString()
    user_uuid?: string;

    @ApiProperty({ required: false, description: "User Name" })
    @IsOptional()
    @IsString()
    user_name?: string;

    @ApiProperty({ required: false, description: "Stage UUID to move selected leads to" })
    @IsOptional()
    @IsString()
    stage_uuid?: string;
}



