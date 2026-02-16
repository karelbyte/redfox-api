import { IsString, IsNumber, Min, MinLength, IsOptional, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';

export class ProductPriceDto {
    @Expose()
    @IsUUID()
    @IsOptional()
    id?: string;

    @Expose()
    @IsString()
    @MinLength(1)
    name: string;

    @Expose()
    @IsNumber()
    @Min(0)
    price: number;
}

export class ProductPriceResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    price: number;
}
