import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters long' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Currency name must be between 1 and 100 characters' })
  name: string;
} 