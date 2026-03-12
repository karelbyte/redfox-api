import { IsString, IsOptional } from 'class-validator';

export class ConvertTrialDto {
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  planId?: string;
}
