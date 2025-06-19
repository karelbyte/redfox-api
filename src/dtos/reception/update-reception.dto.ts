import {
  IsString,
  IsDate,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReceptionDetailDto } from '../reception-detail/create-reception-detail.dto';

export class UpdateReceptionDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsUUID()
  @IsOptional()
  provider_id?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsUUID()
  warehouse_id: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionDetailDto)
  @IsOptional()
  details?: CreateReceptionDetailDto[];

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
