import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class BulkDeleteExpenseDto {
    @IsArray()
    @IsNotEmpty()
    @IsNumber({}, { each: true })
    ids: number[];
}
