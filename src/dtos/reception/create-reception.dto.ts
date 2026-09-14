import { IsString, IsDate, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReceptionDto {
  @IsString()
  code: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsUUID()
  provider_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsString()
  document: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
