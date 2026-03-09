import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class BulkDeleteExpenseDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID(undefined, { each: true })
  ids: string[];
}
