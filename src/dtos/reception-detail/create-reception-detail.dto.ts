import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateReceptionDetailDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;
} 