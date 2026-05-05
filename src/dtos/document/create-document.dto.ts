import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '../../models/employee-document.entity';

export class CreateDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  document_type: DocumentType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  file_path?: string;

  @IsDateString()
  @IsOptional()
  issue_date?: Date;

  @IsDateString()
  @IsOptional()
  expiry_date?: Date;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_verified?: boolean;
}
