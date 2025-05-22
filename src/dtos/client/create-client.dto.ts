import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  description: string;
} 