import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message:
      'El nombre de la organización solo puede contener letras y espacios, sin números ni caracteres especiales.',
  })
  companyName: string;
}
