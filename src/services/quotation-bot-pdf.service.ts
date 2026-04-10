import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Quotation } from '../models/quotation.entity';
import { QuotationDetail } from '../models/quotation-detail.entity';
import { CompanySettings } from '../models/company-settings.entity';

export interface QuotationBotPdfDocument {
  buffer: Buffer;
  fileName: string;
}

type SupportedLocale = 'es' | 'en' | 'zh';

type BotPdfCopy = {
  title: string;
  companyDetails: string;
  clientSection: string;
  quoteSection: string;
  quoteCode: string;
  quoteDate: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  clientCode: string;
  clientEmail: string;
  clientPhone: string;
  warehouse: string;
  status: string;
  validUntil: string;
  product: string;
  price: string;
  quantity: string;
  unit: string;
  productCode: string;
  discount: string;
  subtotal: string;
  total: string;
  tax: string;
  discountTotal: string;
  summary: string;
  notes: string;
  siteQrLabel: string;
  generatedBy: string;
  defaultNote: string;
  notAvailable: string;
  statusMap: Record<string, string>;
};

const DEFAULT_WEBSITE_URL = 'https://nitrostock.work';

const COPY: Record<SupportedLocale, BotPdfCopy> = {
  es: {
    title: 'COTIZACIÓN',
    companyDetails: 'Datos de la empresa',
    clientSection: 'Cliente',
    quoteSection: 'Resumen de cotización',
    quoteCode: 'Folio',
    quoteDate: 'Fecha',
    legalName: 'Razón social',
    taxId: 'RFC',
    phone: 'Teléfono',
    email: 'Correo',
    clientCode: 'Código',
    clientEmail: 'Correo',
    clientPhone: 'Teléfono',
    warehouse: 'Almacén',
    status: 'Estado',
    validUntil: 'Vigencia',
    product: 'Producto',
    price: 'Precio',
    quantity: 'Cant.',
    unit: 'Unidad',
    productCode: 'Código',
    discount: 'Desc.',
    subtotal: 'Subtotal',
    total: 'Total',
    tax: 'Impuestos',
    discountTotal: 'Descuento',
    summary: 'Resumen',
    notes: 'Notas',
    siteQrLabel: 'Sitio web',
    generatedBy: 'Documento generado desde Nitro',
    defaultNote: 'Cotización creada automáticamente desde el bot de WhatsApp.',
    notAvailable: '—',
    statusMap: {
      draft: 'Borrador',
      sent: 'Enviada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Expirada',
      converted: 'Convertida',
    },
  },
  en: {
    title: 'QUOTATION',
    companyDetails: 'Company details',
    clientSection: 'Client',
    quoteSection: 'Quotation summary',
    quoteCode: 'Code',
    quoteDate: 'Date',
    legalName: 'Legal name',
    taxId: 'Tax ID',
    phone: 'Phone',
    email: 'Email',
    clientCode: 'Code',
    clientEmail: 'Email',
    clientPhone: 'Phone',
    warehouse: 'Warehouse',
    status: 'Status',
    validUntil: 'Valid until',
    product: 'Product',
    price: 'Price',
    quantity: 'Qty.',
    unit: 'Unit',
    productCode: 'Code',
    discount: 'Disc.',
    subtotal: 'Subtotal',
    total: 'Total',
    tax: 'Taxes',
    discountTotal: 'Discount',
    summary: 'Summary',
    notes: 'Notes',
    siteQrLabel: 'Website',
    generatedBy: 'Document generated from Nitro',
    defaultNote: 'Quotation created automatically from the WhatsApp bot.',
    notAvailable: '—',
    statusMap: {
      draft: 'Draft',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected',
      expired: 'Expired',
      converted: 'Converted',
    },
  },
  zh: {
    title: '报价单',
    companyDetails: '公司信息',
    clientSection: '客户',
    quoteSection: '报价摘要',
    quoteCode: '单号',
    quoteDate: '日期',
    legalName: '法定名称',
    taxId: '税号',
    phone: '电话',
    email: '邮箱',
    clientCode: '编码',
    clientEmail: '邮箱',
    clientPhone: '电话',
    warehouse: '仓库',
    status: '状态',
    validUntil: '有效期',
    product: '产品',
    price: '价格',
    quantity: '数量',
    unit: '单位',
    productCode: '编码',
    discount: '折扣',
    subtotal: '小计',
    total: '总计',
    tax: '税额',
    discountTotal: '折扣',
    summary: '汇总',
    notes: '备注',
    siteQrLabel: '网站',
    generatedBy: '由 Nitro 自动生成',
    defaultNote: '该报价由 WhatsApp 机器人自动创建。',
    notAvailable: '—',
    statusMap: {
      draft: '草稿',
      sent: '已发送',
      accepted: '已接受',
      rejected: '已拒绝',
      expired: '已过期',
      converted: '已转换',
    },
  },
};

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
    const resolvedLocale = this.resolveLocale(locale);
    const copy = COPY[resolvedLocale];

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
      .leftJoinAndSelect('product.measurement_unit', 'measurementUnit')
      .leftJoinAndSelect('product.tax', 'tax')
      .leftJoin('detail.quotation', 'quotation')
      .where('quotation.id = :quotationId', { quotationId })
      .andWhere('detail.deleted_at IS NULL')
      .orderBy('detail.created_at', 'ASC')
      .getMany();

    const company = await this.companySettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    const websiteUrl = company?.website?.trim() || DEFAULT_WEBSITE_URL;
    const qrBuffer = await QRCode.toBuffer(websiteUrl, {
      margin: 1,
      width: 140,
    });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `${copy.title} ${quotation.code}`,
          Author: company?.name || company?.legalName || 'Nitro',
          Subject: 'Quotation generated from WhatsApp bot',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftX = doc.page.margins.left;
      const rightX = doc.page.width - doc.page.margins.right;
      const boxGap = 12;
      const boxWidth = (contentWidth - boxGap) / 2;

      const money = (value: number) =>
        new Intl.NumberFormat(this.getIntlLocale(resolvedLocale), {
          style: 'currency',
          currency: 'MXN',
        }).format(Number(value || 0));

      const formatDate = (value?: Date | string | null) =>
        value
          ? new Date(value).toLocaleDateString(
              this.getIntlLocale(resolvedLocale),
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              },
            )
          : copy.notAvailable;

      const safe = (value?: string | null) => {
        const text = value?.trim();
        return text ? text : copy.notAvailable;
      };

      const lineValue = (label: string, value?: string | null) =>
        `${label}: ${safe(value)}`;

      let y = 40;

      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F172A');
      doc.text(company?.name || company?.legalName || 'Nitro', leftX, y);
      y += 24;

      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      const companyLines = [
        company?.legalName && company.legalName !== company?.name
          ? lineValue(copy.legalName, company.legalName)
          : null,
        company?.taxId ? lineValue(copy.taxId, company.taxId) : null,
        company?.address || null,
        company?.phone ? lineValue(copy.phone, company.phone) : null,
        company?.email ? lineValue(copy.email, company.email) : null,
      ].filter(Boolean) as string[];

      for (const line of companyLines) {
        doc.text(line, leftX, y, { width: 220 });
        y += doc.heightOfString(line, { width: 220 }) + 3;
      }

      doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827');
      doc.text(copy.title, rightX - 180, 40, {
        width: 180,
        align: 'right',
      });

      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      const metaStartY = 66;
      const metaLines = [
        `${copy.quoteCode}: ${quotation.code}`,
        `${copy.quoteDate}: ${formatDate(quotation.date)}`,
        `${copy.validUntil}: ${formatDate(quotation.valid_until)}`,
        `${copy.status}: ${copy.statusMap[quotation.status] || quotation.status}`,
        quotation.warehouse?.name
          ? `${copy.warehouse}: ${quotation.warehouse.name}`
          : null,
      ].filter(Boolean) as string[];

      let metaY = metaStartY;
      for (const line of metaLines) {
        doc.text(line, rightX - 180, metaY, {
          width: 180,
          align: 'right',
        });
        metaY += 14;
      }

      y = Math.max(y, metaY) + 8;
      doc
        .moveTo(leftX, y)
        .lineTo(rightX, y)
        .strokeColor('#D7DEE7')
        .lineWidth(1)
        .stroke();
      y += 14;

      const clientLines = [
        safe(quotation.client?.name),
        lineValue(copy.clientCode, quotation.client?.code),
        lineValue(copy.clientEmail, quotation.client?.email),
        lineValue(copy.clientPhone, quotation.client?.phone),
      ];

      const quoteLines = [
        `${copy.quoteCode}: ${quotation.code}`,
        `${copy.quoteDate}: ${formatDate(quotation.date)}`,
        `${copy.validUntil}: ${formatDate(quotation.valid_until)}`,
        `${copy.status}: ${copy.statusMap[quotation.status] || quotation.status}`,
        quotation.warehouse?.name
          ? `${copy.warehouse}: ${quotation.warehouse.name}`
          : null,
      ].filter(Boolean) as string[];

      const leftBoxHeight = this.drawInfoBox(doc, {
        x: leftX,
        y,
        width: boxWidth,
        title: copy.clientSection,
        lines: clientLines,
      });

      const rightBoxHeight = this.drawInfoBox(doc, {
        x: leftX + boxWidth + boxGap,
        y,
        width: boxWidth,
        title: copy.quoteSection,
        lines: quoteLines,
      });

      y += Math.max(leftBoxHeight, rightBoxHeight) + 14;

      const table = {
        code: leftX,
        product: leftX + 48,
        unit: leftX + 210,
        quantity: leftX + 250,
        price: leftX + 292,
        discount: leftX + 352,
        tax: leftX + 408,
        subtotal: leftX + 452,
      };

      const renderTableHeader = () => {
        doc.rect(leftX, y, contentWidth, 22).fill('#0F172A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
        doc.text(copy.productCode, table.code + 4, y + 7, {
          width: 40,
          align: 'center',
        });
        doc.text(copy.product, table.product + 4, y + 7, {
          width: 150,
          align: 'left',
        });
        doc.text(copy.unit, table.unit + 2, y + 7, {
          width: 32,
          align: 'center',
        });
        doc.text(copy.quantity, table.quantity + 2, y + 7, {
          width: 36,
          align: 'right',
        });
        doc.text(copy.price, table.price + 2, y + 7, {
          width: 52,
          align: 'right',
        });
        doc.text(copy.discount, table.discount + 2, y + 7, {
          width: 48,
          align: 'right',
        });
        doc.text(copy.tax, table.tax + 2, y + 7, { width: 34, align: 'right' });
        doc.text(copy.subtotal, table.subtotal + 2, y + 7, {
          width: 46,
          align: 'right',
        });
        y += 22;
      };

      renderTableHeader();

      let discountTotal = 0;

      details.forEach((detail, index) => {
        const quantity = Number(detail.quantity || 0);
        const price = Number(detail.price || 0);
        const subtotal = Number(detail.subtotal || 0);
        const discountAmount = Number(detail.discount_amount || 0);
        const discountPercentage = Number(detail.discount_percentage || 0);
        const taxRate = Number(detail.product?.tax?.value || 0);
        const code =
          detail.product?.code || detail.product?.sku || copy.notAvailable;
        const unit =
          detail.product?.measurement_unit?.code || copy.notAvailable;
        const productText = detail.product?.name || copy.product;

        const computedDiscount =
          discountAmount > 0
            ? discountAmount
            : (quantity * price * discountPercentage) / 100;

        discountTotal += computedDiscount;

        const rowHeight = Math.max(
          22,
          doc.heightOfString(productText, {
            width: 150,
          }) + 8,
        );

        if (y + rowHeight > doc.page.height - 110) {
          doc.addPage();
          y = 40;
          renderTableHeader();
        }

        if (index % 2 === 0) {
          doc.rect(leftX, y, contentWidth, rowHeight).fill('#F8FAFC');
        }

        doc.fillColor('#1F2937').font('Helvetica').fontSize(8.5);
        doc.text(safe(code), table.code + 4, y + 7, {
          width: 40,
          align: 'center',
        });
        doc.text(productText, table.product + 4, y + 7, {
          width: 150,
          align: 'left',
        });
        doc.text(safe(unit), table.unit + 2, y + 7, {
          width: 32,
          align: 'center',
        });
        doc.text(quantity.toFixed(2), table.quantity + 2, y + 7, {
          width: 36,
          align: 'right',
        });
        doc.text(money(price), table.price + 2, y + 7, {
          width: 52,
          align: 'right',
        });
        doc.text(
          computedDiscount > 0
            ? money(computedDiscount)
            : discountPercentage > 0
              ? `${discountPercentage.toFixed(2)}%`
              : copy.notAvailable,
          table.discount + 2,
          y + 7,
          {
            width: 48,
            align: 'right',
          },
        );
        doc.text(
          taxRate > 0 ? `${taxRate.toFixed(2)}%` : copy.notAvailable,
          table.tax + 2,
          y + 7,
          {
            width: 34,
            align: 'right',
          },
        );
        doc.text(money(subtotal), table.subtotal + 2, y + 7, {
          width: 46,
          align: 'right',
        });

        y += rowHeight;
      });

      y += 10;
      const summaryX = rightX - 170;

      doc
        .roundedRect(summaryX, y, 170, 70, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10);
      doc.text(copy.summary, summaryX + 10, y + 10);

      const summaryRows = [
        { label: copy.subtotal, value: money(Number(quotation.subtotal || 0)) },
        {
          label: copy.discountTotal,
          value: discountTotal > 0 ? money(discountTotal) : copy.notAvailable,
        },
        { label: copy.tax, value: money(Number(quotation.tax || 0)) },
      ];

      let summaryY = y + 24;
      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      for (const row of summaryRows) {
        doc.text(row.label, summaryX + 10, summaryY);
        doc.text(row.value, summaryX, summaryY, { width: 160, align: 'right' });
        summaryY += 14;
      }

      doc
        .moveTo(summaryX + 10, summaryY - 5)
        .lineTo(summaryX + 160, summaryY - 5)
        .strokeColor('#CBD5E1')
        .stroke();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A');
      doc.text(copy.total, summaryX + 10, summaryY + 6);
      doc.text(money(Number(quotation.total || 0)), summaryX, summaryY + 6, {
        width: 160,
        align: 'right',
      });

      y = Math.max(y + 82, summaryY + 20);

      const notesText = quotation.notes?.trim() || copy.defaultNote;
      if (notesText) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A');
        doc.text(copy.notes, leftX, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        doc.text(notesText, leftX, y, { width: contentWidth - 120 });
      }

      const footerY = doc.page.height - 84;
      doc.image(qrBuffer, leftX, footerY, { fit: [54, 54] });
      doc.font('Helvetica').fontSize(8).fillColor('#64748B');
      doc.text(copy.siteQrLabel, leftX + 27, footerY + 62, {
        width: 0,
        align: 'center',
      });
      doc.text(
        copy.generatedBy,
        doc.page.width / 2 - 90,
        doc.page.height - 34,
        {
          width: 180,
          align: 'center',
        },
      );

      doc.end();
    });

    return {
      buffer,
      fileName: `cotizacion-${quotation.code}.pdf`,
    };
  }

  private resolveLocale(locale?: string): SupportedLocale {
    const normalized = (locale || 'es').split('-')[0].toLowerCase();
    if (normalized === 'en' || normalized === 'zh') {
      return normalized;
    }

    return 'es';
  }

  private getIntlLocale(locale: SupportedLocale): string {
    if (locale === 'en') {
      return 'en-US';
    }
    if (locale === 'zh') {
      return 'zh-CN';
    }
    return 'es-MX';
  }

  private drawInfoBox(
    doc: any,
    params: {
      x: number;
      y: number;
      width: number;
      title: string;
      lines: string[];
    },
  ): number {
    const { x, y, width, title, lines } = params;
    const lineHeights = lines.map(
      (line) =>
        doc.heightOfString(line, {
          width: width - 20,
        }) + 3,
    );
    const contentHeight = lineHeights.reduce((sum, value) => sum + value, 0);
    const height = Math.max(62, 18 + contentHeight + 10);

    doc.roundedRect(x, y, width, height, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10);
    doc.text(title, x + 10, y + 10);

    let cursorY = y + 28;
    doc.fillColor('#475569').font('Helvetica').fontSize(9);
    lines.forEach((line) => {
      doc.text(line, x + 10, cursorY, {
        width: width - 20,
      });
      cursorY += doc.heightOfString(line, { width: width - 20 }) + 3;
    });

    return height;
  }
}
