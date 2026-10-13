import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum DuplicateStrategy {
    SKIP = "SKIP",
    UPDATE = "UPDATE",
    OVERWRITE = "OVERWRITE",
}

export enum SyncModuleType {
    TENANT_ROLE = "TENANT_ROLE",
    TENANT = "TENANT",
    USER_ROLE = "USER_ROLE",
    USER_GROUP = "USER_GROUP",
    DID = "DID",
    IP_MAPPING = "IP_MAPPING",
    TRUNK = "TRUNK",
    OUTGOING_RULES = "OUTGOING_RULES",
    BREAK_CODE = "BREAK_CODE",
    DISPOSITION = "DISPOSITION",
    CAMPAIGN = "CAMPAIGN",
    CAMPAIGN_LEAD_GROUP = "CAMPAIGN_LEAD_GROUP",
    USERS = "USERS",
    SIP_DEVICES = "SIP_DEVICES",
    USER_AND_SIP_DEVICES = "USER_AND_SIP_DEVICES",
    VOICE_BROADCAST = "VOICE_BROADCAST",
}

export class ExecuteSyncDto {
    @ApiProperty({ description: "Source server identifier or IP/URL" })
    @IsNotEmpty()
    @IsString()
    source_server: string;

    @ApiProperty({ description: "Target server identifier or IP/URL" })
    @IsNotEmpty()
    @IsString()
    target_server: string;

    @ApiProperty({
        description: "List of modules to synchronize, or ['ALL']",
        example: ["TENANT_ROLE", "TENANT", "TRUNK", "OUTGOING_RULES"],
    })
    @IsArray()
    @IsNotEmpty()
    modules: string[];

    @ApiPropertyOptional({
        enum: DuplicateStrategy,
        default: DuplicateStrategy.SKIP,
        description: "How to handle records that already exist on target server",
    })
    @IsOptional()
    @IsEnum(DuplicateStrategy)
    duplicate_strategy?: DuplicateStrategy;

    @ApiPropertyOptional({ description: "Optional specific tenant_uuid to filter synchronization scope" })
    @IsOptional()
    @IsString()
    tenant_uuid?: string;
}

export class PreviewSyncDto {
    @ApiProperty({ description: "Source server identifier or IP/URL" })
    @IsNotEmpty()
    @IsString()
    source_server: string;

    @ApiProperty({ description: "Target server identifier or IP/URL" })
    @IsNotEmpty()
    @IsString()
    target_server: string;

    @ApiProperty({ description: "List of modules to preview", example: ["ALL"] })
    @IsArray()
    @IsNotEmpty()
    modules: string[];

    @ApiPropertyOptional({ description: "Optional tenant_uuid filter" })
    @IsOptional()
    @IsString()
    tenant_uuid?: string;
}

export class ExportDataDto {
    @ApiProperty({ description: "Module to export", enum: SyncModuleType })
    @IsNotEmpty()
    @IsString()
    module: string;

    @ApiPropertyOptional({ description: "Optional tenant UUID filter" })
    @IsOptional()
    @IsString()
    tenant_uuid?: string;
}

export class ImportDataDto {
    @ApiProperty({ description: "Module to import", enum: SyncModuleType })
    @IsNotEmpty()
    @IsString()
    module: string;

    @ApiProperty({ description: "Array of records to import" })
    @IsArray()
    records: any[];

    @ApiProperty({ description: "Current ID mapping table (source_uuid -> target_uuid)" })
    @IsOptional()
    id_map?: Record<string, string>;

    @ApiPropertyOptional({ enum: DuplicateStrategy, default: DuplicateStrategy.SKIP })
    @IsOptional()
    @IsEnum(DuplicateStrategy)
    duplicate_strategy?: DuplicateStrategy;
}

export class ValidatePipelineDto {
    @ApiProperty({ description: "Source server identifier, IP, or URI" })
    @IsNotEmpty()
    @IsString()
    source_server: string;

    @ApiProperty({ description: "Target server identifier, IP, or URI" })
    @IsNotEmpty()
    @IsString()
    target_server: string;
}
