import { IsArray, IsUUID } from 'class-validator';

export class BulkDeleteProviderDto {
    @IsArray()
    @IsUUID('4', { each: true })
    ids: string[];
}
