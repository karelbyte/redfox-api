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
import { CreateWithdrawalDetailDto } from './create-withdrawal.dto';
import { WithdrawalType } from '../../models/withdrawal.entity';

export class UpdateWithdrawalDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  code?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  destination?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWithdrawalDetailDto)
  details?: CreateWithdrawalDetailDto[];
}
