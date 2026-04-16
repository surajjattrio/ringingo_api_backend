import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteOAuthDto {
  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  root_folder_id: string;
}