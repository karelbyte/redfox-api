export class CashRegisterResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  initial_amount: number;
  current_amount: number;
  status: string;
  opened_at?: Date;
  closed_at?: Date;
  opened_by: string;
  closed_by?: string;
  created_at: Date;
  updated_at: Date;
}
