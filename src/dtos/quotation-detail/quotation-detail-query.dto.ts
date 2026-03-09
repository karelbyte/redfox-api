import { IsOptional, IsNumberString } from 'class-validator';

export class QuotationDetailQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;
}
