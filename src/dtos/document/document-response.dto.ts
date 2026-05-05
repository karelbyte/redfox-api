import { Document, DocumentType } from '../../models/employee-document.entity';

export class DocumentResponseDto {
  id: string;
  employee_id: string;
  document_type: DocumentType;
  title: string;
  description: string;
  file_path: string;
  issue_date: Date;
  expiry_date: Date;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;

  static fromEntity(entity: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = entity.id;
    dto.employee_id = entity.employee_id;
    dto.document_type = entity.document_type;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.file_path = entity.file_path;
    dto.issue_date = entity.issue_date;
    dto.expiry_date = entity.expiry_date;
    dto.is_verified = entity.is_verified;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    return dto;
  }
}
