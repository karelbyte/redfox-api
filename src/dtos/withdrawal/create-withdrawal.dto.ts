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
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WithdrawalType } from '../../models/withdrawal.entity';

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

  @IsEnum(WithdrawalType)
  @IsOptional()
  type?: WithdrawalType;

  @IsUUID()
  @IsOptional()
  cash_transaction_id?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
