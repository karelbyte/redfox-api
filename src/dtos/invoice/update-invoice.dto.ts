import {
  IsOptional,
  IsString,
  Length,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { InvoiceStatus, PaymentMethod, CardType } from '../../models/invoice.entity';

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  @Length(3, 50)
  code?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsEnum(CardType)
  @IsOptional()
  card_type?: CardType;

  @IsString()
  @IsOptional()
  @Length(3, 100)
  payment_conditions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
