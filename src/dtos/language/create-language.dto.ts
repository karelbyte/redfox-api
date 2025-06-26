import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  code: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  userId: string;
}
