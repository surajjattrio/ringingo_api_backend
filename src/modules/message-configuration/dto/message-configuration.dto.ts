import { PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateMessageConfigurationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsArray()
  @IsOptional()
  headers: any[];

  @IsArray()
  @IsOptional()
  templates: string[];

  @IsString()
  @IsOptional()
  body: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  tenant_uuid: string;
}

export class UpdateMessageConfigurationDto extends PartialType(CreateMessageConfigurationDto) { }
