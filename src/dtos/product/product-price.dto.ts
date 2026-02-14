import { IsString, IsNumber, Min, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class ProductPriceDto {
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
