export class ClientCreditResponseDto {
    id: string;
    credit_limit: number;
    credit_days: number;
    is_active: boolean;
    currency_id?: string;
    created_at: Date;
}
