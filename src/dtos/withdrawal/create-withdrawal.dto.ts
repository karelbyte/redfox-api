import {
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  Length,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDetailDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateWithdrawalDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 200)
  destination: string;

  @IsUUID()
  client_id: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

}
