import { IsString, IsNumber, Min, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class ProductPriceDto {
    @IsString()
    @MinLength(3)
    name: string;

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
