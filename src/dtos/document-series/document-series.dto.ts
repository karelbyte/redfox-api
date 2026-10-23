import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DocumentType } from '../../models/document-series.entity';

export class CreateDocumentSeriesDto {
  @IsEnum(DocumentType)
  document_type: DocumentType;

  /** Código de serie de SUNAT: una letra seguida de tres dígitos (F001, B001). */
  @IsString()
  @Length(1, 10)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'series must contain only letters and digits',
  })
  series: string;

  @IsOptional()
  @IsString()
  emitter_id?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

/**
 * El correlativo no se puede modificar por API: es la garantía de que la
 * numeración no tenga huecos ni repeticiones.
 */
export class UpdateDocumentSeriesDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
