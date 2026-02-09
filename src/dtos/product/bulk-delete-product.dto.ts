import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class BulkDeleteProductDto {
    @IsArray()
    @IsNotEmpty()
    @IsUUID('4', { each: true })
    ids: string[];
}
