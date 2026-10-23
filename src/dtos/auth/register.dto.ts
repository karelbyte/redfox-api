import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SUPPORTED_COUNTRIES } from '../../constants/countries.constant';

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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  referrer_code?: string;

  /**
   * País de la organización en ISO 3166-1 alpha-2. Determina los packs de
   * facturación y los catálogos con los que arranca. Si no se indica se usa
   * el país por defecto.
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(SUPPORTED_COUNTRIES)
  country?: string;

  @IsOptional()
  @IsString()
  @IsIn(['es', 'en', 'zh'])
  language?: string;
}
