import { IsString, IsUUID, IsBoolean, IsOptional, Length, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDetailDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class CreateWithdrawalDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 200)
  destination: string;

  @IsUUID()
  client_id: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWithdrawalDetailDto)
  details: CreateWithdrawalDetailDto[];
} 