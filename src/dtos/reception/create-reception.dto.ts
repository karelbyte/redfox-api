import {
  IsString,
  IsDate,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReceptionDetailDto } from '../reception-detail/create-reception-detail.dto';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionDetailDto)
  details: CreateReceptionDetailDto[];
}
