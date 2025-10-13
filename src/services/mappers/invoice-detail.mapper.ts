import { Injectable } from '@nestjs/common';
import { InvoiceDetail } from '../../models/invoice-detail.entity';
import { InvoiceDetailResponseDto } from '../../dtos/invoice-detail/invoice-detail-response.dto';
import { ProductMapper } from './product.mapper';

@Injectable()
export class InvoiceDetailMapper {
  constructor(private readonly productMapper: ProductMapper) {}

  mapToResponseDto(detail: InvoiceDetail): InvoiceDetailResponseDto {
    if (!detail) {
      throw new Error('InvoiceDetail cannot be null');
    }

    const {
      id,
      quantity,
      price,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      product,
      created_at,
    } = detail;

    return {
      id,
      quantity,
      price,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      product: this.productMapper.mapToResponseDto(product),
      created_at,
    };
  }
}
