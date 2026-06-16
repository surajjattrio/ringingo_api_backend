import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

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

  @IsString()
  @IsOptional()
  variables: string;

  @IsString()
  @IsOptional()
  status: string;
}

export class UpdateApiConfigurationDto extends CreateApiConfigurationDto { }
