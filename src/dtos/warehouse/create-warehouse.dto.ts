import {
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  IsUUID,
} from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 200)
  address: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsString()
  @IsUUID()
  currencyId: string;
}
