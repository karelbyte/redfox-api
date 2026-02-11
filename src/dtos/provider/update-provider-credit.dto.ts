import { IsOptional, IsNumber, IsInt, IsBoolean, IsUUID, Min } from 'class-validator';

export class UpdateProviderCreditDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    credit_limit?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    credit_days?: number;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsUUID()
    @IsOptional()
    currency_id?: string;
}
