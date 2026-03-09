import {
  IsUUID,
  IsNumber,
  Min,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateReceptionDetailDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  batch_number?: string;

  @IsDateString()
  @IsOptional()
  expiration_date?: string;
}
