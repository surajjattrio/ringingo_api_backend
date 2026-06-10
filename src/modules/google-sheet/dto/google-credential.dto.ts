import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min, IsUUID, } from 'class-validator';

export class CreateGoogleCredentialDto {
    // ---------- Tenant ----------

    @IsUUID()
    @IsOptional()
    @IsString()
    tenant_uuid?: string;

    // ---------- Google Sheet Service Account ----------

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    project_id: string;

    @IsString()
    @IsNotEmpty()
    private_key_id: string;

    @IsString()
    @IsNotEmpty()
    private_key: string;

    @IsString()
    @IsNotEmpty()
    client_email: string;

    @IsString()
    @IsNotEmpty()
    client_id: string;

    @IsString()
    @IsNotEmpty()
    auth_uri: string;

    @IsString()
    @IsNotEmpty()
    token_uri: string;

    @IsString()
    @IsNotEmpty()
    auth_provider_x509_cert_url: string;

    @IsString()
    @IsNotEmpty()
    client_x509_cert_url: string;

    @IsOptional()
    @IsString()
    universe_domain?: string;

    // ---------- Google Sheet Config ----------

    @IsString()
    @IsNotEmpty()
    sheet_id: string;

    @IsString()
    @IsNotEmpty()
    range: string;

    @IsString()
    @IsNotEmpty()
    scopes: string; // e.g. "https://www.googleapis.com/auth/spreadsheets.readonly"

    @IsOptional()
    @IsNumber()
    @Min(0)
    cache_ttl?: number = 3600;

    @IsOptional()
    @IsString()
    cache_key?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    timeout_ms?: number = 300000;

    @IsOptional()
    @IsInt()
    @Min(0)
    max_retries?: number = 3;

    @IsOptional()
    @IsInt()
    @Min(1)
    chunk_size?: number = 1000;

    @IsOptional()
    @IsInt()
    @Min(1)
    max_total_rows?: number = 100000;

    @IsOptional()
    @IsBoolean()
    filter_today?: boolean = false;

    @IsOptional()
    @IsInt()
    @Min(0)
    date_column_index?: number = 7;

    // ---------- OAuth Credentials ----------

    @IsOptional()
    @IsString()
    google_client_id?: string;

    @IsOptional()
    @IsString()
    google_client_secret?: string;

    @IsOptional()
    @IsString()
    refresh_token?: string;

    // ---------- Runtime Tokens ----------

    @IsOptional()
    @IsString()
    access_token?: string;

    @IsOptional()
    @IsDateString()
    token_expiry?: Date;

    // ---------- Status ----------

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}