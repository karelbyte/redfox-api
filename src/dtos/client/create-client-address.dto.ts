import { IsEnum, IsString, IsOptional, Length, IsBoolean } from 'class-validator';
import { AddressType } from '../../models/client-address.entity';

export class CreateClientAddressDto {
    @IsEnum(AddressType)
    @IsOptional()
    type?: AddressType;

    @IsString()
    @IsOptional()
    @Length(0, 200)
    street?: string;

    @IsString()
    @IsOptional()
    @Length(0, 20)
    exterior_number?: string;

    @IsString()
    @IsOptional()
    @Length(0, 20)
    interior_number?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    neighborhood?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    city?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    municipality?: string;

    @IsString()
    @IsOptional()
    @Length(0, 10)
    zip_code?: string;

    @IsString()
    @IsOptional()
    @Length(0, 100)
    state?: string;

    @IsString()
    @IsOptional()
    @Length(0, 3)
    country?: string;

    @IsBoolean()
    @IsOptional()
    is_main?: boolean;
}
