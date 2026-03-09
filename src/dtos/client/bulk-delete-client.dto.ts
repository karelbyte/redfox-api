import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class BulkDeleteClientDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
