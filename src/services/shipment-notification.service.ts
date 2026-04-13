import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from '../models/shipment.entity';
import { BotSettings, BotConnectionStatus } from '../models/bot-settings.entity';
import { BaileysProviderService } from './baileys-provider.service';
import { NotificationService } from './notification.service';
import { TranslationService } from './translation.service';
import { EmailService } from './email.service';
import { User } from '../models/user.entity';
import { NotificationType, NotificationPriority } from '../models/notification.entity';

@Injectable()
export class ShipmentNotificationService {
  private readonly logger = new Logger(ShipmentNotificationService.name);

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(BotSettings)
    private readonly botSettingsRepository: Repository<BotSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly baileysProviderService: BaileysProviderService,
    private readonly notificationService: NotificationService,
    private readonly translationService: TranslationService,
    private readonly emailService: EmailService,
  ) {}

  async notifyStatusChange(shipment: Shipment) {
    try {
      await this.notifyInternally(shipment);

      if (shipment.status === ShipmentStatus.SHIPPED || shipment.status === ShipmentStatus.DELIVERED) {
        const sentViaWhatsApp = await this.notifyViaWhatsApp(shipment);
        if (!sentViaWhatsApp) {
          await this.notifyViaEmail(shipment);
        }
      }
    } catch (error) {
      this.logger.error(`Error in ShipmentNotificationService: ${error.message}`);
    }
  }

  async notifyDelayedShipments(shipments: Shipment[]) {
    for (const shipment of shipments) {
      const users = await this.userRepository.find({
        where: { organization_id: shipment.organization_id },
      });

      const title = await this.translationService.translate('shipment.delayed_alert_title', users[0]?.id);
      const message = await this.translationService.translate('shipment.delayed_alert_message', users[0]?.id, {
        code: shipment.withdrawal?.code || shipment.withdrawal_id,
        carrier: shipment.carrier,
        date: shipment.estimated_delivery_date ? new Date(shipment.estimated_delivery_date).toLocaleDateString() : 'N/A',
      });

      for (const user of users) {
        await this.notificationService.create({
          title,
          message,
          type: NotificationType.WARNING,
          priority: NotificationPriority.HIGH,
          userId: user.id,
          actionUrl: `/dashboard/ventas/envios`,
          actionLabel: 'Ver Envíos',
          metadata: { shipmentId: shipment.id, type: 'shipment_delayed' },
        });
      }
    }
  }

  private async notifyInternally(shipment: Shipment) {
    const users = await this.userRepository.find({
      where: { organization_id: shipment.organization_id },
    });

    const title = await this.translationService.translate('shipment.status_update_title', users[0]?.id);
    const message = await this.translationService.translate('shipment.status_update_message', users[0]?.id, {
      id: shipment.tracking_number || shipment.id,
      status: shipment.status,
    });

    for (const user of users) {
      await this.notificationService.create({
        title,
        message,
        type: NotificationType.SHIPMENT,
        priority: NotificationPriority.MEDIUM,
        userId: user.id,
        actionUrl: `/dashboard/ventas/envios`,
        actionLabel: 'Ver Envío',
        metadata: { shipmentId: shipment.id, status: shipment.status },
      });
    }
  }

  private async notifyViaWhatsApp(shipment: Shipment): Promise<boolean> {
    const settings = await this.botSettingsRepository.findOne({
      where: { organization_id: shipment.organization_id },
      relations: ['organization'],
    });

    if (!settings || !settings.is_enabled || settings.connection_status !== BotConnectionStatus.CONNECTED) {
      return false;
    }

    const withdrawal = shipment.withdrawal;
    if (!withdrawal || !withdrawal.client || !withdrawal.client.phone) {
      return false;
    }

    const clientPhone = withdrawal.client.phone.replace(/\D/g, '');
    if (!clientPhone) return false;

    const jid = `${clientPhone}@s.whatsapp.net`;
    const locale = settings.default_language || 'es';

    let message = '';
    if (shipment.status === ShipmentStatus.SHIPPED) {
      message = await this.translationService.translateWithLanguage('shipment.whatsapp_sent', locale, {
        name: withdrawal.client.name,
        company: settings.organization?.name || 'Redfox',
        carrier: shipment.carrier,
        tracking: shipment.tracking_number || 'N/A',
        url: shipment.tracking_url || 'N/A',
      });
    } else if (shipment.status === ShipmentStatus.DELIVERED) {
      message = await this.translationService.translateWithLanguage('shipment.whatsapp_delivered', locale, {
        name: withdrawal.client.name,
        tracking: shipment.tracking_number || 'N/A',
      });
    }

    if (!message) return false;

    try {
      await this.baileysProviderService.sendText(shipment.organization_id, jid, message);
      return true;
    } catch (error) {
      this.logger.warn(`WhatsApp send failed for shipment ${shipment.id}: ${error.message}`);
      return false;
    }
  }

  private async notifyViaEmail(shipment: Shipment): Promise<void> {
    const withdrawal = shipment.withdrawal;
    if (!withdrawal || !withdrawal.client || !withdrawal.client.email) {
      return;
    }

    const clientEmail = withdrawal.client.email;
    const clientName = withdrawal.client.name || '';
    const tracking = shipment.tracking_number || 'N/A';
    const carrier = shipment.carrier || 'N/A';

    let subject = '';
    let html = '';

    if (shipment.status === ShipmentStatus.SHIPPED) {
      subject = `🚚 Tu pedido está en camino — ${tracking}`;
      html = this.buildShippedEmailHtml({ clientName, carrier, tracking, trackingUrl: shipment.tracking_url });
    } else if (shipment.status === ShipmentStatus.DELIVERED) {
      subject = `✅ Tu pedido fue entregado — ${tracking}`;
      html = this.buildDeliveredEmailHtml({ clientName, tracking });
    }

    if (!subject) return;

    const result = await this.emailService.sendOrganizationEmail(shipment.organization_id, {
      to: clientEmail,
      subject,
      html,
    });

    if (!result.configured) {
      this.logger.debug(`No email config for org ${shipment.organization_id}, skipping email notification`);
    } else if (!result.sent) {
      this.logger.warn(`Email notification failed for shipment ${shipment.id}`);
    }
  }

  private buildShippedEmailHtml(data: { clientName: string; carrier: string; tracking: string; trackingUrl?: string }): string {
    const trackingLink = data.trackingUrl
      ? `<p style="margin:16px 0;"><a href="${data.trackingUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Rastrear envío</a></p>`
      : '';

    return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">🚚 Tu pedido está en camino</h2>
        <p>Hola <strong>${data.clientName}</strong>,</p>
        <p>Tu pedido ha sido enviado y está en camino.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:600;width:40%;">Paquetería</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.carrier}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:600;">Número de guía</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${data.tracking}</td></tr>
        </table>
        ${trackingLink}
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">Gracias por tu compra.</p>
      </div>
    `;
  }

  private buildDeliveredEmailHtml(data: { clientName: string; tracking: string }): string {
    return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="color:#16a34a;margin-bottom:8px;">✅ Tu pedido fue entregado</h2>
        <p>Hola <strong>${data.clientName}</strong>,</p>
        <p>Tu pedido con número de guía <strong style="font-family:monospace;">${data.tracking}</strong> ha sido entregado exitosamente.</p>
        <p>Esperamos que lo disfrutes. ¡Vuelve pronto!</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">Gracias por tu compra.</p>
      </div>
    `;
  }
}
