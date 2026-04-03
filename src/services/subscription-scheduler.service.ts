import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';
import { ConfigService } from '@nestjs/config';
import { SubscriptionEmailService } from './subscription-email.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private subscriptionEmailService: SubscriptionEmailService,
  ) {}

  // Ejecutar todos los días a las 9:00 AM - Recordatorio de trial (3 días antes)
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendTrialExpirationReminders() {
    this.logger.log('Starting trial expiration reminder job');

    try {
      // Calcular la fecha de 3 días desde ahora
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      // Buscar suscripciones en trial que expiran en 3 días y no se les ha enviado recordatorio
      const subscriptions = await this.subscriptionRepository.find({
        where: {
          status: 'trial',
          trial_reminder_sent: false,
          trial_end_date: LessThanOrEqual(threeDaysFromNow),
        },
        relations: ['organization', 'plan'],
      });

      this.logger.log(`Found ${subscriptions.length} subscriptions to send reminders`);

      for (const subscription of subscriptions) {
        try {
          await this.sendTrialReminderEmail(subscription);
          
          // Marcar como enviado
          subscription.trial_reminder_sent = true;
          await this.subscriptionRepository.save(subscription);
          
          this.logger.log(`Reminder sent for subscription ${subscription.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder for subscription ${subscription.id}`,
            error,
          );
        }
      }

      this.logger.log('Trial expiration reminder job completed');
    } catch (error) {
      this.logger.error('Error in trial expiration reminder job', error);
    }
  }

  // Ejecutar todos los días a las 10:00 AM - Recordatorio de renovación (1 día antes)
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendRenewalReminders() {
    this.logger.log('Starting renewal reminder job');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Buscar suscripciones activas que vencen mañana y no se les ha enviado recordatorio
      const subscriptions = await this.subscriptionRepository.find({
        where: {
          status: 'active',
          renewal_reminder_sent: false,
          current_period_end: LessThanOrEqual(tomorrow),
        },
        relations: ['organization', 'plan'],
      });

      this.logger.log(`Found ${subscriptions.length} subscriptions expiring tomorrow`);

      for (const subscription of subscriptions) {
        try {
          await this.sendRenewalReminderEmail(subscription);
          
          // Marcar como enviado
          subscription.renewal_reminder_sent = true;
          await this.subscriptionRepository.save(subscription);
          
          this.logger.log(`Renewal reminder sent for subscription ${subscription.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to send renewal reminder for subscription ${subscription.id}`,
            error,
          );
        }
      }

      this.logger.log('Renewal reminder job completed');
    } catch (error) {
      this.logger.error('Error in renewal reminder job', error);
    }
  }

  // Ejecutar todos los días a las 11:00 AM - Marcar como expiradas
  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async markExpiredSubscriptions() {
    this.logger.log('Starting mark expired subscriptions job');

    try {
      const now = new Date();

      // Buscar suscripciones activas que ya vencieron
      const subscriptions = await this.subscriptionRepository.find({
        where: {
          status: 'active',
          current_period_end: LessThanOrEqual(now),
        },
        relations: ['organization', 'plan'],
      });

      this.logger.log(`Found ${subscriptions.length} expired subscriptions`);

      for (const subscription of subscriptions) {
        try {
          // Cambiar estado a expired
          subscription.status = 'expired';
          await this.subscriptionRepository.save(subscription);
          
          // Enviar email de notificación de expiración
          await this.sendExpiredEmail(subscription);
          
          this.logger.log(`Subscription ${subscription.id} marked as expired`);
        } catch (error) {
          this.logger.error(
            `Failed to mark subscription ${subscription.id} as expired`,
            error,
          );
        }
      }

      this.logger.log('Mark expired subscriptions job completed');
    } catch (error) {
      this.logger.error('Error in mark expired subscriptions job', error);
    }
  }

  private async sendTrialReminderEmail(subscription: any) {
    const daysRemaining = Math.ceil(
      (subscription.trial_end_date.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const user = await this.userRepository.findOne({
      where: { organization_id: subscription.organization_id },
      order: { created_at: 'ASC' },
    });

    if (!user) {
      this.logger.warn(`[TRIAL REMINDER] No user found for org ${subscription.organization_id}`);
      return;
    }

    await this.subscriptionEmailService.sendTrialReminder({
      to: user.email,
      userName: user.name,
      organizationSlug: subscription.organization?.slug ?? 'app',
      daysRemaining,
      trialEndDate: new Date(subscription.trial_end_date),
    });
  }

  private async sendRenewalReminderEmail(subscription: any) {
    const user = await this.userRepository.findOne({
      where: { organization_id: subscription.organization_id },
      order: { created_at: 'ASC' },
    });

    if (!user) {
      this.logger.warn(`[RENEWAL REMINDER] No user found for org ${subscription.organization_id}`);
      return;
    }

    await this.subscriptionEmailService.sendRenewalReminder({
      to: user.email,
      userName: user.name,
      organizationSlug: subscription.organization?.slug ?? 'app',
      planName: subscription.plan?.name ?? 'Plan Nitro',
      amount: Number(subscription.plan?.price ?? 0),
      currency: subscription.plan?.currency ?? 'MXN',
      expirationDate: new Date(subscription.current_period_end),
    });
  }

  private async sendExpiredEmail(subscription: any) {
    const user = await this.userRepository.findOne({
      where: { organization_id: subscription.organization_id },
      order: { created_at: 'ASC' },
    });

    if (!user) {
      this.logger.warn(`[EXPIRED] No user found for org ${subscription.organization_id}`);
      return;
    }

    await this.subscriptionEmailService.sendExpiredNotification({
      to: user.email,
      userName: user.name,
      organizationSlug: subscription.organization?.slug ?? 'app',
      planName: subscription.plan?.name ?? 'Plan Nitro',
      amount: Number(subscription.plan?.price ?? 0),
      currency: subscription.plan?.currency ?? 'MXN',
    });
  }
}
