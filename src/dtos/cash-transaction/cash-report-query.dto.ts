import { IsNotEmpty, IsString } from 'class-validator';

export class CashReportQueryDto {
  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;
} 