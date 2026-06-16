import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray } from 'class-validator';

export class CreateApiConfigurationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsEmail()
  @IsNotEmpty()
  fromEmail: string;

  @IsString()
  @IsOptional()
  baseUrl: string;

  @IsString()
  @IsOptional()
  attachmentFileName: string;

  @IsString()
  @IsOptional()
  attachmentFileUrl: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables: string[];

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  tenant_uuid: string; // Added to prevent whitelist stripping
}

export class UpdateApiConfigurationDto extends CreateApiConfigurationDto { }
