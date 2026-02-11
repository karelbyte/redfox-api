export class ProviderAddressResponseDto {
    id: string;
    type: string;
    street: string;
    exterior_number: string;
    interior_number: string;
    neighborhood: string;
    city: string;
    municipality: string;
    zip_code: string;
    state: string;
    country: string;
    is_main: boolean;
    created_at: Date;
}

export class ProviderTaxDataResponseDto {
    id: string;
    tax_document: string;
    tax_system: string;
    tax_name: string;
    default_invoice_use: string;
    is_main: boolean;
    created_at: Date;
}

export class ProviderCreditResponseDto {
    id: string;
    credit_limit: number;
    credit_days: number;
    is_active: boolean;
    currency_id: string;
    created_at: Date;
}
