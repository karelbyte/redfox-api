export class SurrogateResponseDto {
  id: string;
  code: string;
  prefix: string;
  suffix: string;
  next_number: number;
  padding: number;
  include_year: boolean;
  year_separator: string;
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  next_code?: string; // El próximo código que se generaría
}