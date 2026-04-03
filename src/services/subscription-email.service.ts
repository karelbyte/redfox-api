import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailQueue } from '../queues/email.queue';
import { SubscriptionReceiptPdfService } from './subscription-receipt-pdf.service';

// Shared email shell — dark theme matching existing Nitro emails
function nitroShell(content: string, year: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter','Segoe UI',Tahoma,Geneva,Verdana,sans-serif; line-height:1.6; color:#E2E8F0; margin:0; padding:0; background-color:#0F172A; }
    .container { max-width:600px; margin:40px auto; background:#1E293B; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,.5); border:1px solid #334155; }
    .header { background:#2D3748; padding:40px 20px; text-align:center; border-bottom:2px solid #EAB308; }
    .header h1 { color:#F8FAFC; margin:0; font-size:32px; font-weight:800; letter-spacing:-.025em; text-transform:uppercase; }
    .header h1 span { color:#EAB308; }
    .content { padding:40px; }
    .footer { background-color:#0F172A; padding:24px; text-align:center; font-size:13px; color:#64748B; border-top:1px solid #334155; }
    .btn { display:inline-block; padding:16px 36px; background-color:#EAB308; color:#0F172A !important; text-decoration:none; border-radius:8px; font-weight:700; margin:20px 0; text-transform:uppercase; font-size:14px; }
    .badge-green { background:#10B981; color:#fff; padding:10px 22px; border-radius:8px; display:inline-block; font-weight:700; font-size:13px; }
    .badge-yellow { background:#EAB308; color:#0F172A; padding:10px 22px; border-radius:8px; display:inline-block; font-weight:700; font-size:13px; }
    .badge-red { background:#EF4444; color:#fff; padding:10px 22px; border-radius:8px; display:inline-block; font-weight:700; font-size:13px; }
    .box { background:#0F172A; border:1px solid #334155; border-radius:12px; padding:24px; margin:24px 0; }
    .box-yellow { background:#0F172A; border:2px solid #EAB308; border-radius:12px; padding:24px; margin:24px 0; }
    .box-red { background:#0F172A; border:2px solid #EF4444; border-radius:12px; padding:24px; margin:24px 0; }
    .label { color:#94A3B8; font-size:13px; margin:0; }
    .value { color:#F8FAFC; font-weight:600; font-size:15px; margin:2px 0 12px; }
    .divider { border:none; border-top:1px solid #334155; margin:24px 0; }
    h2 { color:#F8FAFC; font-size:20px; margin-top:0; }
    h3 { color:#EAB308; font-size:17px; margin-top:0; }
    p { color:#CBD5E1; font-size:15px; }
    .amount { font-size:36px; font-weight:800; color:#EAB308; }
    .amount span { font-size:16px; color:#94A3B8; font-weight:400; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>NITRO<span>.</span></h1></div>
    <div class="content">${content}</div>
    <div class="footer">&copy; ${year} NITRO. El motor de tu negocio.<br>Todos los derechos reservados.</div>
  </div>
</body>
</html>`;
}

@Injectable()
export class SubscriptionEmailService {
  private readonly logger = new Logger(SubscriptionEmailService.name);

  constructor(
    private readonly emailQueue: EmailQueue,
    private readonly configService: ConfigService,
    private readonly receiptPdfService: SubscriptionReceiptPdfService,
  ) {}

  // ─── 1. Confirmación de pago / activación ────────────────────────────────

  async sendPaymentConfirmation(params: {
    to: string;
    userName: string;
    organizationName: string;
    planName: string;
    billingPeriod: string;
    amount: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    paymentIntentId?: string;
  }) {
    const {
      to, userName, organizationName, planName, billingPeriod,
      amount, currency, periodStart, periodEnd, paymentIntentId,
    } = params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const fmt = (d: Date) =>
      d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const periodLabel = billingPeriod === 'yearly' || billingPeriod === 'annual'
      ? 'Anual' : 'Mensual';

    const content = `
      <div style="text-align:center;margin-bottom:28px;">
        <span class="badge-green">✓ PAGO CONFIRMADO</span>
      </div>

      <h2>¡Gracias, ${userName}!</h2>
      <p>Tu suscripción a <strong style="color:#EAB308">Nitro</strong> ha sido activada exitosamente. Aquí está el resumen de tu pago:</p>

      <div class="box-yellow">
        <h3>🧾 Recibo de Pago</h3>

        <p class="label">Organización</p>
        <p class="value">${organizationName}</p>

        <p class="label">Plan</p>
        <p class="value">${planName} — ${periodLabel}</p>

        <p class="label">Monto cobrado</p>
        <div class="amount">$${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span>${currency}</span></div>

        <hr class="divider">

        <p class="label">Período de vigencia</p>
        <p class="value">${fmt(periodStart)} → ${fmt(periodEnd)}</p>

        ${paymentIntentId ? `<p class="label">Referencia de pago</p><p class="value" style="font-size:12px;font-family:monospace;">${paymentIntentId}</p>` : ''}
      </div>

      <p>Tu acceso completo a Nitro está activo. Puedes gestionar tu suscripción en cualquier momento desde el panel.</p>

      <div style="text-align:center;">
        <a href="${frontendUrl}" class="btn">Ir a mi panel</a>
      </div>
    `;

    try {
      // Generar PDF del recibo
      const receiptNumber = `NIT-${Date.now().toString(36).toUpperCase()}`;
      const pdfBuffer = await this.receiptPdfService.generate({
        receiptNumber,
        issueDate: new Date(),
        userName,
        organizationName,
        planName,
        billingPeriod,
        amount,
        currency,
        periodStart,
        periodEnd,
        paymentIntentId,
      });

      await this.emailQueue.addEmailJob({
        to,
        subject: `✅ Pago confirmado — ${planName} ${periodLabel}`,
        html: nitroShell(content, year),
        attachments: [
          {
            filename: `recibo-nitro-${receiptNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`[SUBSCRIPTION] Payment confirmation + receipt PDF sent to ${to}`);
    } catch (error) {
      this.logger.error(`[SUBSCRIPTION] Failed to send payment confirmation to ${to}`, error);
    }
  }

  // ─── 2. Recordatorio de fin de trial ─────────────────────────────────────

  async sendTrialReminder(params: {
    to: string;
    userName: string;
    organizationSlug: string;
    daysRemaining: number;
    trialEndDate: Date;
  }) {
    const { to, userName, organizationSlug, daysRemaining, trialEndDate } = params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const paymentUrl = `${frontendUrl}/${organizationSlug}/es/dashboard/suscripcion/pago`;
    const year = new Date().getFullYear();

    const fmt = (d: Date) =>
      d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const urgency = daysRemaining === 1 ? '¡Último día!' : `${daysRemaining} días restantes`;

    const content = `
      <div style="text-align:center;margin-bottom:28px;">
        <span class="badge-yellow">⏰ ${urgency.toUpperCase()}</span>
      </div>

      <h2>Hola, ${userName}</h2>
      <p>Tu período de prueba gratuita de <strong style="color:#EAB308">Nitro</strong> está por terminar.</p>

      <div class="box-yellow">
        <h3>⏳ Tu prueba finaliza el ${fmt(trialEndDate)}</h3>
        <p>Te quedan <strong style="color:#EAB308">${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}</strong> para activar tu suscripción y no perder el acceso a tu cuenta.</p>
        <p>Todos tus datos, productos, clientes y configuraciones están guardados y seguros.</p>
      </div>

      <p>Activa tu suscripción ahora y sigue usando Nitro sin interrupciones:</p>

      <div style="text-align:center;">
        <a href="${paymentUrl}" class="btn">Activar mi suscripción</a>
      </div>
    `;

    try {
      await this.emailQueue.addEmailJob({
        to,
        subject: `⏰ Tu prueba de Nitro finaliza en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`,
        html: nitroShell(content, year),
      });
      this.logger.log(`[SUBSCRIPTION] Trial reminder sent to ${to} (${daysRemaining} days left)`);
    } catch (error) {
      this.logger.error(`[SUBSCRIPTION] Failed to send trial reminder to ${to}`, error);
    }
  }

  // ─── 3. Recordatorio de renovación ───────────────────────────────────────

  async sendRenewalReminder(params: {
    to: string;
    userName: string;
    organizationSlug: string;
    planName: string;
    amount: number;
    currency: string;
    expirationDate: Date;
  }) {
    const { to, userName, organizationSlug, planName, amount, currency, expirationDate } = params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const paymentUrl = `${frontendUrl}/${organizationSlug}/es/dashboard/suscripcion/pago`;
    const year = new Date().getFullYear();

    const fmt = (d: Date) =>
      d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = `
      <div style="text-align:center;margin-bottom:28px;">
        <span class="badge-yellow">🔔 RENOVACIÓN PRÓXIMA</span>
      </div>

      <h2>Hola, ${userName}</h2>
      <p>Tu suscripción a <strong style="color:#EAB308">Nitro</strong> vence mañana. Renuévala para no perder el acceso.</p>

      <div class="box-yellow">
        <h3>📅 Tu suscripción vence el ${fmt(expirationDate)}</h3>

        <p class="label">Plan actual</p>
        <p class="value">${planName}</p>

        <p class="label">Monto de renovación</p>
        <div class="amount">$${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span>${currency}</span></div>
      </div>

      <p>Renueva ahora para mantener el acceso continuo a todos tus datos y funcionalidades:</p>

      <div style="text-align:center;">
        <a href="${paymentUrl}" class="btn">Renovar mi suscripción</a>
      </div>
    `;

    try {
      await this.emailQueue.addEmailJob({
        to,
        subject: `🔔 Tu suscripción de Nitro vence mañana — Renueva ahora`,
        html: nitroShell(content, year),
      });
      this.logger.log(`[SUBSCRIPTION] Renewal reminder sent to ${to}`);
    } catch (error) {
      this.logger.error(`[SUBSCRIPTION] Failed to send renewal reminder to ${to}`, error);
    }
  }

  // ─── 4. Suscripción expirada ──────────────────────────────────────────────

  async sendExpiredNotification(params: {
    to: string;
    userName: string;
    organizationSlug: string;
    planName: string;
    amount: number;
    currency: string;
  }) {
    const { to, userName, organizationSlug, planName, amount, currency } = params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const paymentUrl = `${frontendUrl}/${organizationSlug}/es/dashboard/suscripcion/pago`;
    const year = new Date().getFullYear();

    const content = `
      <div style="text-align:center;margin-bottom:28px;">
        <span class="badge-red">⚠️ SUSCRIPCIÓN EXPIRADA</span>
      </div>

      <h2>Hola, ${userName}</h2>
      <p>Tu suscripción a <strong style="color:#EAB308">Nitro</strong> ha expirado. Tu acceso al sistema está temporalmente suspendido.</p>

      <div class="box-red">
        <h3 style="color:#EF4444;">❌ Acceso suspendido</h3>
        <p>Tu plan <strong style="color:#F8FAFC">${planName}</strong> ha vencido.</p>
        <p>Todos tus datos están seguros y se conservarán. Solo necesitas renovar para recuperar el acceso completo.</p>

        <p class="label">Monto de renovación</p>
        <div class="amount">$${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span>${currency}</span></div>
      </div>

      <p>Reactiva tu suscripción ahora para recuperar el acceso inmediatamente:</p>

      <div style="text-align:center;">
        <a href="${paymentUrl}" class="btn">Reactivar mi suscripción</a>
      </div>
    `;

    try {
      await this.emailQueue.addEmailJob({
        to,
        subject: `⚠️ Tu suscripción de Nitro ha expirado — Reactiva ahora`,
        html: nitroShell(content, year),
      });
      this.logger.log(`[SUBSCRIPTION] Expired notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`[SUBSCRIPTION] Failed to send expired notification to ${to}`, error);
    }
  }
}
