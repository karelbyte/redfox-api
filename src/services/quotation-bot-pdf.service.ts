import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { Quotation } from '../models/quotation.entity';
import { QuotationDetail } from '../models/quotation-detail.entity';
import { CompanySettings } from '../models/company-settings.entity';

export interface QuotationBotPdfDocument {
  buffer: Buffer;
  fileName: string;
}

@Injectable()
export class QuotationBotPdfService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationDetail)
    private readonly quotationDetailRepository: Repository<QuotationDetail>,
    @InjectRepository(CompanySettings)
    private readonly companySettingsRepository: Repository<CompanySettings>,
  ) {}

  async generate(
    organizationId: string,
    quotationId: string,
    locale: string = 'es',
  ): Promise<QuotationBotPdfDocument> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: organizationId },
      relations: ['client', 'warehouse'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const details = await this.quotationDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoin('detail.quotation', 'quotation')
      .where('quotation.id = :quotationId', { quotationId })
      .andWhere('detail.deleted_at IS NULL')
      .orderBy('detail.created_at', 'ASC')
      .getMany();

    const company = await this.companySettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Cotizacion ${quotation.code}`,
          Author: company?.name || 'Nitro',
          Subject: 'Cotizacion generada desde WhatsApp',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const formatDate = (value?: Date | string | null) =>
        value
          ? new Date(value).toLocaleDateString(
              locale === 'en' ? 'en-US' : locale === 'zh' ? 'zh-CN' : 'es-MX',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              },
            )
          : '-';

      const money = (value: number) =>
        `$${Number(value || 0).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      let y = 40;

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#111827')
        .text(company?.name || company?.legalName || 'Nitro', 40, y);

      y += 28;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#4B5563')
        .text(company?.address || '', 40, y);
      y += 14;
      doc.text(
        [company?.phone, company?.email, company?.website].filter(Boolean).join(' | '),
        40,
        y,
      );

      y = 40;
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#1F2937')
        .text('COTIZACION', 0, y, { align: 'right' });
      y += 24;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#4B5563')
        .text(`Folio: ${quotation.code}`, 0, y, { align: 'right' });
      y += 14;
      doc.text(`Fecha: ${formatDate(quotation.date)}`, 0, y, { align: 'right' });
      y += 14;
      doc.text(`Valida hasta: ${formatDate(quotation.valid_until)}`, 0, y, {
        align: 'right',
      });

      y = 140;
      doc
        .moveTo(40, y)
        .lineTo(doc.page.width - 40, y)
        .strokeColor('#D1D5DB')
        .lineWidth(1)
        .stroke();

      y += 18;
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#111827')
        .text('Cliente', 40, y);
      y += 16;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(quotation.client?.name || '-', 40, y);
      y += 14;
      doc.text(quotation.client?.email || '-', 40, y);
      y += 14;
      doc.text(quotation.client?.phone || '-', 40, y);

      y += 24;
      const tableTop = y;
      const pageWidth = doc.page.width - 80;
      const cols = {
        product: 40,
        quantity: 300,
        price: 380,
        subtotal: 470,
      };

      doc
        .rect(40, tableTop, pageWidth, 24)
        .fill('#F3F4F6')
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Producto', cols.product, tableTop + 7)
        .text('Cant.', cols.quantity, tableTop + 7)
        .text('Precio', cols.price, tableTop + 7)
        .text('Subtotal', cols.subtotal, tableTop + 7);

      y = tableTop + 30;
      doc.font('Helvetica').fontSize(10).fillColor('#374151');

      for (const detail of details) {
        const lineSubtotal =
          Number(detail.subtotal) ||
          Number(detail.quantity) * Number(detail.price);

        if (y > 720) {
          doc.addPage();
          y = 40;
        }

        doc.text(detail.product?.name || 'Producto', cols.product, y, {
          width: 240,
        });
        doc.text(Number(detail.quantity).toFixed(2), cols.quantity, y, {
          width: 60,
          align: 'right',
        });
        doc.text(money(Number(detail.price)), cols.price, y, {
          width: 70,
          align: 'right',
        });
        doc.text(money(lineSubtotal), cols.subtotal, y, {
          width: 85,
          align: 'right',
        });

        y += 22;
      }

      y += 12;
      doc
        .moveTo(330, y)
        .lineTo(doc.page.width - 40, y)
        .strokeColor('#D1D5DB')
        .lineWidth(1)
        .stroke();

      y += 12;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(`Subtotal: ${money(Number(quotation.subtotal))}`, 330, y, {
          width: 225,
          align: 'right',
        });
      y += 16;
      doc.text(`Impuestos: ${money(Number(quotation.tax))}`, 330, y, {
        width: 225,
        align: 'right',
      });
      y += 18;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text(`Total: ${money(Number(quotation.total))}`, 330, y, {
          width: 225,
          align: 'right',
        });

      if (quotation.notes) {
        y += 36;
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#111827')
          .text('Notas', 40, y);
        y += 16;
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#374151')
          .text(quotation.notes, 40, y, {
            width: doc.page.width - 80,
          });
      }

      doc.end();
    });

    return {
      buffer,
      fileName: `cotizacion-${quotation.code}.pdf`,
    };
  }
}
