import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;
} 