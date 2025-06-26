export class PermissionResponseDto {
  id: string;
  code: string;
  module: string;
  description: string;
  createdAt: Date;
  deletedAt?: Date;
}
