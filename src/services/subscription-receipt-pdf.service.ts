import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface ReceiptData {
  receiptNumber: string;
  issueDate: Date;
  userName: string;
  organizationName: string;
  planName: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paymentIntentId?: string;
}

// Brand colors (Nitro dark theme)
const C = {
  bg: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  accent: '#EAB308',
  accentDark: '#CA8A04',
  white: '#F8FAFC',
  muted: '#94A3B8',
  text: '#CBD5E1',
  green: '#10B981',
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

@Injectable()
export class SubscriptionReceiptPdfService {
  async generate(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Recibo de Pago — ${data.planName}`,
          Author: 'Nitro',
          Subject: 'Recibo de suscripción',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width; // 595
      const H = doc.page.height; // 842

      // ── Background ──────────────────────────────────────────────────────
      doc.rect(0, 0, W, H).fill(hexToRgb(C.bg));

      // ── Header band ─────────────────────────────────────────────────────
      doc.rect(0, 0, W, 110).fill(hexToRgb(C.surface));
      // Accent bottom border on header
      doc.rect(0, 108, W, 3).fill(hexToRgb(C.accent));

      // Logo / brand name
      doc
        .font('Helvetica-Bold')
        .fontSize(32)
        .fillColor(hexToRgb(C.white))
        .text('NITRO', 50, 36, { continued: true })
        .fillColor(hexToRgb(C.accent))
        .text('.');

      // Tagline
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(hexToRgb(C.muted))
        .text('El motor de tu negocio', 50, 74);

      // "RECIBO DE PAGO" label — right side of header
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(hexToRgb(C.accent))
        .text('RECIBO DE PAGO', 0, 38, { align: 'right', width: W - 50 });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(hexToRgb(C.muted))
        .text(`N° ${data.receiptNumber}`, 0, 56, {
          align: 'right',
          width: W - 50,
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(hexToRgb(C.muted))
        .text(this.fmt(data.issueDate), 0, 70, {
          align: 'right',
          width: W - 50,
        });

      // ── Status badge ─────────────────────────────────────────────────────
      const badgeY = 130;
      const badgeW = 160;
      const badgeX = (W - badgeW) / 2;
      doc.roundedRect(badgeX, badgeY, badgeW, 28, 6).fill(hexToRgb(C.green));
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(hexToRgb(C.white))
        .text('✓  PAGO CONFIRMADO', badgeX, badgeY + 8, {
          width: badgeW,
          align: 'center',
        });

      // ── Client info card ─────────────────────────────────────────────────
      const cardX = 50;
      const cardW = W - 100;
      let y = 180;

      doc.roundedRect(cardX, y, cardW, 80, 8).fill(hexToRgb(C.surface));
      // left accent bar
      doc.rect(cardX, y, 4, 80).fill(hexToRgb(C.accent));

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(hexToRgb(C.muted))
        .text('FACTURADO A', cardX + 20, y + 14);

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(hexToRgb(C.white))
        .text(data.organizationName, cardX + 20, y + 28);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(hexToRgb(C.text))
        .text(data.userName, cardX + 20, y + 46);

      // ── Plan details card ─────────────────────────────────────────────────
      y = 280;
      doc.roundedRect(cardX, y, cardW, 200, 8).fill(hexToRgb(C.surface));
      doc.rect(cardX, y, 4, 200).fill(hexToRgb(C.accent));

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(hexToRgb(C.muted))
        .text('DETALLE DEL PLAN', cardX + 20, y + 16);

      // Divider
      doc
        .moveTo(cardX + 20, y + 32)
        .lineTo(cardX + cardW - 20, y + 32)
        .strokeColor(hexToRgb(C.border))
        .lineWidth(0.5)
        .stroke();

      const rows: [string, string][] = [
        ['Plan', `${data.planName} — ${this.periodLabel(data.billingPeriod)}`],
        [
          'Período de vigencia',
          `${this.fmt(data.periodStart)}  →  ${this.fmt(data.periodEnd)}`,
        ],
        ['Método de pago', 'Tarjeta de crédito / débito'],
        ['Estado del pago', 'Completado'],
      ];

      let rowY = y + 44;
      for (const [label, value] of rows) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(hexToRgb(C.muted))
          .text(label, cardX + 20, rowY);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(hexToRgb(C.white))
          .text(value, cardX + 20, rowY + 13);
        rowY += 38;
      }

      // ── Amount box ────────────────────────────────────────────────────────
      y = 500;
      doc.roundedRect(cardX, y, cardW, 90, 8).fill(hexToRgb(C.surface));
      // Full accent border
      doc
        .roundedRect(cardX, y, cardW, 90, 8)
        .stroke(hexToRgb(C.accent))
        .lineWidth(1.5);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(hexToRgb(C.muted))
        .text('TOTAL COBRADO', cardX + 20, y + 16);

      const amountStr = `$${Number(data.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc
        .font('Helvetica-Bold')
        .fontSize(36)
        .fillColor(hexToRgb(C.accent))
        .text(amountStr, cardX + 20, y + 34, { continued: true })
        .font('Helvetica')
        .fontSize(14)
        .fillColor(hexToRgb(C.muted))
        .text(`  ${data.currency}`);

      // ── Reference ─────────────────────────────────────────────────────────
      if (data.paymentIntentId) {
        y = 610;
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(hexToRgb(C.muted))
          .text('Referencia de pago:', cardX, y);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(hexToRgb(C.text))
          .text(data.paymentIntentId, cardX, y + 12);
      }

      // ── Footer ────────────────────────────────────────────────────────────
      const footerY = H - 70;
      doc.rect(0, footerY, W, 70).fill(hexToRgb(C.surface));
      doc.rect(0, footerY, W, 1.5).fill(hexToRgb(C.border));

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(hexToRgb(C.muted))
        .text(
          `© ${new Date().getFullYear()} NITRO. El motor de tu negocio. Todos los derechos reservados.`,
          0,
          footerY + 16,
          { align: 'center', width: W },
        );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(hexToRgb(C.muted))
        .text(
          'Este documento es un comprobante de pago de suscripción. No es un comprobante fiscal (CFDI).',
          0,
          footerY + 32,
          { align: 'center', width: W },
        );

      doc.end();
    });
  }

  private fmt(d: Date): string {
    return new Date(d).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private periodLabel(period: string): string {
    if (period === 'yearly' || period === 'annual') return 'Anual';
    if (period === 'lifetime') return 'De por vida';
    return 'Mensual';
  }
}
