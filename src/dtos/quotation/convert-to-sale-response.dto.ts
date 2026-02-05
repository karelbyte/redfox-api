export class ConvertToSaleResponseDto {
  quotationId: string;
  quotationCode: string;
  saleId: string;
  saleCode: string;
  totalProducts: number;
  totalAmount: number;
  message: string;
  convertedAt: Date;
}