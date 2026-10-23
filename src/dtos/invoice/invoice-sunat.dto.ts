import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceSunatDto {
  @IsString()
  documentType: string;

  @IsString()
  series: string;

  @IsNumber()
  number: number;

  @IsString()
  issueDate: string;

  @IsOptional()
  @IsString()
  issueTime?: string;

  @IsString()
  currency: string;

  @IsString()
  operationType: string;

  @IsString()
  customerDocumentType: string;

  @IsString()
  customerDocumentNumber: string;

  @IsString()
  customerName: string;

  @IsString()
  customerAddress: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemSunatDto)
  items: InvoiceItemSunatDto[];

  @IsString()
  total: string;
}

export class InvoiceItemSunatDto {
  @IsString()
  unitOfMeasure: string;

  @IsString()
  description: string;

  @IsString()
  quantity: string;

  @IsString()
  unitValue: string;

  @IsString()
  igvPercentage: string;

  @IsString()
  igvAffectationTypeCode: string;

  @IsString()
  taxName: string;
}