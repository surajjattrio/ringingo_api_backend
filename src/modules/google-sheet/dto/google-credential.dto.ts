import { IsBoolean, IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString } from "class-validator";

export class CreateGoogleCredentialDto {
    @IsUUID()
    @IsOptional()
    tenant_uuid: string;

    @IsString()
    @IsNotEmpty()
    client_id: string;

    @IsString()
    @IsNotEmpty()
    client_email: string;

    @IsString()
    @IsNotEmpty()
    private_key: string;

    @IsString()
    @IsNotEmpty()
    scopes: string; // e.g. "https://www.googleapis.com/auth/spreadsheets.readonly"

    @IsString()
    @IsNotEmpty()
    sheet_id: string;

    @IsString()
    @IsNotEmpty()
    range: string;

    @IsOptional()
    @IsString()
    access_token?: string;

    @IsOptional()
    @IsString()
    refresh_token?: string;

    @IsOptional()
    @IsDateString()
    token_expiry?: Date;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
