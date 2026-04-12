import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
  clientAddress: string;
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
    clientAddress: 'Dirección',
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
    clientAddress: 'Address',
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
    defaultNote: '从 WhatsApp 机器人自动创建的报价单。',
    notAvailable: '—',
    clientAddress: '地址',
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
    private readonly configService: ConfigService,
  ) { }

  async generate(
    organizationId: string,
    quotationId: string,
    locale: string = 'es',
  ): Promise<QuotationBotPdfDocument> {
    const resolvedLocale = this.resolveLocale(locale);
    const copy = COPY[resolvedLocale];

    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: organizationId },
      relations: ['client', 'warehouse', 'client.taxData', 'client.addresses'],
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

    let logoBuffer: Buffer | null = null;
    if (company?.logoUrl) {
      try {
        let absoluteLogoUrl = company.logoUrl;
        if (absoluteLogoUrl.startsWith('/')) {
          const publicUrl = this.configService
            .get<string>('APP_PUBLIC_URL', 'http://localhost:4010')
            .replace(/\/$/, '');
          absoluteLogoUrl = `${publicUrl}${absoluteLogoUrl}`;
        }

        const response = await fetch(absoluteLogoUrl);
        if (response.ok) {
          logoBuffer = Buffer.from(await response.arrayBuffer());
        }
      } catch (e) {
        console.error('Error fetching company logo:', e);
      }
    }

    const websiteUrl = company?.website?.trim() || DEFAULT_WEBSITE_URL;
    const qrBuffer = await QRCode.toBuffer(websiteUrl, {
      margin: 1,
      width: 140,
    });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `${copy.title} ${quotation.code}`,
          Author: company?.name || company?.legalName || 'Nitro',
          Subject: 'Quotation generated from Nitro',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const margin = doc.page.margins.left;
      const rightEnd = doc.page.width - doc.page.margins.right;

      const money = (value: number) =>
        new Intl.NumberFormat(this.getIntlLocale(resolvedLocale), {
          style: 'currency',
          currency: 'MXN',
        }).format(Number(value || 0));

      const formatDate = (value?: Date | string | null) => {
        if (!value) return copy.notAvailable;
        const parsed = new Date(value);
        return parsed.toLocaleDateString(this.getIntlLocale(resolvedLocale), {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const safe = (value?: string | null) => (value?.trim() ? value.trim() : copy.notAvailable);
      const lineValue = (label: string, value?: string | null) => `${label}: ${safe(value)}`;

      let currentY = 40;

      // Header
      const topY = currentY;
      const colW = contentWidth / 3;
      const leftX = margin;
      const centerX = margin + colW;
      const rightX = margin + colW * 2;

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(company?.name || company?.legalName || 'Nitro', leftX, topY);

      doc.font('Helvetica').fontSize(8).fillColor('#4b5563');
      let companyY = topY + 16;
      const companyLines = [
        company?.legalName && company.legalName !== company?.name ? lineValue(copy.legalName, company.legalName) : null,
        company?.taxId ? lineValue(copy.taxId, company.taxId) : null,
        company?.address,
        company?.phone ? lineValue(copy.phone, company.phone) : null,
        company?.email ? lineValue(copy.email, company.email) : null,
      ].filter(Boolean) as string[];

      for (const line of companyLines) {
        doc.text(line, leftX, companyY, { width: colW - 10 });
        companyY += doc.heightOfString(line, { width: colW - 10 }) + 2;
      }

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, centerX + (colW - 60) / 2, topY, { fit: [60, 40], align: 'center', valign: 'center' });
        } catch (e) { /* skip */ }
      }

      doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text(copy.title, rightX, topY, { align: 'right', width: colW });

      let metaY = topY + 22;
      doc.font('Helvetica').fontSize(9).fillColor('#374151');
      const metaLines = [
        `${copy.quoteCode}: ${quotation.code}`,
        `${copy.quoteDate}: ${formatDate(quotation.date)}`,
        `${copy.validUntil}: ${formatDate(quotation.valid_until)}`,
        `${copy.status}: ${copy.statusMap[quotation.status] || quotation.status.toUpperCase()}`,
        quotation.warehouse?.name ? `${copy.warehouse}: ${quotation.warehouse.name}` : null,
      ].filter(Boolean) as string[];

      for (const line of metaLines) {
        doc.text(line, rightX, metaY, { align: 'right', width: colW });
        metaY += 14;
      }

      currentY = Math.max(companyY, metaY) + 10;
      doc.moveTo(leftX, currentY).lineTo(rightEnd, currentY).strokeColor('#d1d5d9').lineWidth(0.5).stroke();
      currentY += 15;

      // Client Card
      const boxWidth = contentWidth;
      const startCardY = currentY;
      const mainTaxData = quotation.client?.taxData?.find(t => t.is_main) || quotation.client?.taxData?.[0];
      const mainAddress = quotation.client?.addresses?.find(a => a.is_main) || quotation.client?.addresses?.[0];
      const addrLines = [
        mainAddress?.street,
        mainAddress?.exterior_number ? `${mainAddress.exterior_number}${mainAddress.interior_number ? ' Int. ' + mainAddress.interior_number : ''}` : null,
        mainAddress?.neighborhood,
        mainAddress?.city,
        mainAddress?.state,
        mainAddress?.zip_code,
      ].filter(line => line && line.trim().length > 0);
      const addressString = addrLines.join(', ');

      const clientLines = [
        lineValue(copy.clientCode, quotation.client?.code),
        quotation.client?.email ? lineValue(copy.clientEmail, quotation.client.email) : null,
        quotation.client?.phone ? lineValue(copy.clientPhone, quotation.client.phone) : null,
        mainTaxData?.tax_document ? lineValue(copy.taxId, mainTaxData.tax_document) : null,
        addressString ? lineValue(copy.clientAddress, addressString) : null,
      ].filter(Boolean) as string[];

      const leftH = this.drawSyncInfoCard(doc, leftX, startCardY, boxWidth, quotation.client?.name || copy.clientSection, clientLines);
      currentY = startCardY + leftH + 20;

      // Table
      const tableX = { code: leftX, product: leftX + 50, qty: leftX + 205, price: leftX + 260, disc: leftX + 325, tax: leftX + 385, total: leftX + 450 };
      const renderHeader = () => {
        doc.rect(leftX, currentY, contentWidth, 22).fill('#3b82f6');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
        doc.text(copy.productCode, tableX.code + 5, currentY + 7);
        doc.text(copy.product, tableX.product + 5, currentY + 7);
        doc.text(copy.quantity, tableX.qty, currentY + 7, { width: 50, align: 'center' });
        doc.text(copy.price, tableX.price, currentY + 7, { width: 60, align: 'right' });
        doc.text(copy.discount, tableX.disc, currentY + 7, { width: 55, align: 'right' });
        doc.text(copy.tax, tableX.tax, currentY + 7, { width: 60, align: 'right' });
        doc.text(copy.subtotal, tableX.total, currentY + 7, { width: contentWidth - (tableX.total - leftX) - 5, align: 'right' });
        currentY += 22;
      };

      renderHeader();
      let discountSum = 0;
      details.forEach((item, i) => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const subtotal = Number(item.subtotal || 0);
        const discAmt = Number(item.discount_amount || 0);
        const discPct = Number(item.discount_percentage || 0);
        const unitCode = item.product?.measurement_unit?.code || '';
        const computedDisc = discAmt > 0 ? discAmt : (qty * price * discPct) / 100;
        discountSum += computedDisc;

        const rowH = Math.max(20, doc.heightOfString(item.product?.name || '', { width: 150 }) + 8);
        if (currentY + rowH > doc.page.height - 110) { doc.addPage(); currentY = 40; renderHeader(); }
        if (i % 2 === 1) doc.rect(leftX, currentY, contentWidth, rowH).fill('#f8fafc');
        doc.font('Helvetica').fontSize(8).fillColor('#1f2937');
        doc.text(safe(item.product?.code), tableX.code + 5, currentY + 6);
        doc.font('Helvetica-Bold').text(item.product?.name || '', tableX.product + 5, currentY + 6, { width: 150 });
        doc.font('Helvetica').text(`${qty} ${unitCode}`, tableX.qty, currentY + 6, { width: 50, align: 'center' });
        doc.text(money(price), tableX.price, currentY + 6, { width: 60, align: 'right' });
        doc.text(computedDisc > 0 ? money(computedDisc) : discPct > 0 ? `-${discPct}%` : copy.notAvailable, tableX.disc, currentY + 6, { width: 55, align: 'right' });
        doc.text(Number(item.product?.tax?.value || 0) > 0 ? `${item.product?.tax?.value}%` : copy.notAvailable, tableX.tax, currentY + 6, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text(money(subtotal), tableX.total, currentY + 6, { width: contentWidth - (tableX.total - leftX) - 5, align: 'right' });
        currentY += rowH;
      });

      // Summary
      currentY += 15;
      const sumW = 200, sumX = rightEnd - sumW, sumH = 80;
      if (currentY + sumH > doc.page.height - 110) { doc.addPage(); currentY = 40; }
      doc.roundedRect(sumX, currentY, sumW, sumH, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      let sumY = currentY + 12;
      const sums = [
        { l: copy.subtotal, v: money(Number(quotation.subtotal || 0)) },
        { l: copy.discountTotal, v: discountSum > 0 ? money(discountSum) : money(0) },
        { l: copy.tax, v: money(Number(quotation.tax || 0)) },
      ];
      doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
      for (const s of sums) {
        doc.text(s.l, sumX + 10, sumY);
        doc.text(s.v, sumX + 10, sumY, { width: sumW - 20, align: 'right' });
        sumY += 15;
      }
      doc.moveTo(sumX + 10, sumY).lineTo(sumX + sumW - 10, sumY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      sumY += 8;
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(copy.total, sumX + 10, sumY);
      doc.text(money(Number(quotation.total || 0)), sumX + 10, sumY, { width: sumW - 20, align: 'right' });
      currentY += sumH + 20;

      // Notes
      if (quotation.notes?.trim()) {
        const noteH = doc.heightOfString(quotation.notes, { width: contentWidth }) + 20;
        if (currentY + noteH > doc.page.height - 110) { doc.addPage(); currentY = 40; }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(copy.notes, leftX, currentY);
        currentY += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(quotation.notes, leftX, currentY, { width: contentWidth });
      }

      // ── Footer en cada página (ANTES de doc.end, única forma de escribir con bufferPages) ──
      const footerPages = doc.bufferedPageRange();
      for (let fi = 0; fi < footerPages.count; fi++) {
        doc.switchToPage(fi);

        // Eliminar margen inferior para que image/text no creen una página extra
        doc.page.margins.bottom = 0;

        const ph = doc.page.height;
        const pw = doc.page.width;
        const fml = 40;
        const fmr = 40;
        const fcw = pw - fml - fmr;
        const fY = ph - 55;

        // Línea separadora
        doc.moveTo(fml, fY - 8).lineTo(pw - fmr, fY - 8)
          .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        // QR en esquina inferior izquierda
        if (qrBuffer) {
          try {
            doc.image(qrBuffer, fml, fY, { width: 28, height: 28 });
          } catch (_e) { /* skip qr */ }
        }

        // Texto "Generado por Nitro" centrado
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
          .text(copy.generatedBy, fml, fY + 4, { width: fcw, align: 'center', lineBreak: false });

        // Paginación centrada
        doc.fontSize(7).fillColor('#64748b')
          .text(`${resolvedLocale.toUpperCase()} | ${fi + 1} / ${footerPages.count}`, fml, fY + 15, { width: fcw, align: 'center', lineBreak: false });

        // Label del QR
        doc.fontSize(6).fillColor('#94a3b8')
          .text(copy.siteQrLabel, fml, fY + 30, { width: 28, align: 'center', lineBreak: false });
      }

      doc.end();
    });

    return { buffer, fileName: `cotizacion-${quotation.code}.pdf` };
  }

  private resolveLocale(locale?: string): SupportedLocale {
    const normalized = (locale || 'es').split('-')[0].toLowerCase();
    if (normalized === 'en' || normalized === 'zh') return normalized;
    return 'es';
  }

  private getIntlLocale(locale: SupportedLocale): string {
    if (locale === 'en') return 'en-US';
    if (locale === 'zh') return 'zh-CN';
    return 'es-MX';
  }

  private drawSyncInfoCard(doc: any, x: number, y: number, w: number, title: string, lines: string[]): number {
    const minH = 40, padding = 10, lineHeight = 12;
    const h = Math.max(minH, padding * 2 + 15 + lines.length * lineHeight);
    doc.roundedRect(x, y, w, h, 4).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(title.toUpperCase(), x + padding, y + padding);
    let curY = y + padding + 15;
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
    for (const line of lines) {
      doc.text(line, x + padding, curY, { width: w - padding * 2 });
      curY += lineHeight;
    }
    return h;
  }
}
