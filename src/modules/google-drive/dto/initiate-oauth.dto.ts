import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class InitiateOAuthDto {
  @IsString()
  @IsNotEmpty()
  tenant_uuid: string;

  @IsString()
  @IsOptional()
  root_folder_id?: string;

  @IsString()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  client_secret?: string;
}