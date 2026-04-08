import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import {
  AccountReceivable,
  AccountReceivableStatus,
} from '../models/account-receivable.entity';
import { Notification } from '../models/notification.entity';
import {
  NotificationType,
  NotificationPriority,
} from '../models/notification.entity';
import { User } from '../models/user.entity';

@Injectable()
export class OverdueAccountsSchedulerService {
  private readonly logger = new Logger(OverdueAccountsSchedulerService.name);

  constructor(
    @InjectRepository(AccountReceivable)
    private readonly accountReceivableRepository: Repository<AccountReceivable>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Corre todos los días a las 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueAccounts() {
    this.logger.log('Iniciando revisión de cuentas por cobrar vencidas...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Obtener todas las cuentas vencidas agrupadas por organización
      const overdueAccounts = await this.accountReceivableRepository.find({
        where: {
          dueDate: LessThan(today),
          status: In([
            AccountReceivableStatus.PENDING,
            AccountReceivableStatus.PARTIAL,
          ]),
        },
        relations: ['client'],
      });

      if (overdueAccounts.length === 0) {
        this.logger.log('No hay cuentas vencidas.');
        return;
      }

      // Actualizar status a OVERDUE
      await this.accountReceivableRepository
        .createQueryBuilder()
        .update(AccountReceivable)
        .set({ status: AccountReceivableStatus.OVERDUE })
        .where('dueDate < :today', { today })
        .andWhere('status IN (:...statuses)', {
          statuses: [
            AccountReceivableStatus.PENDING,
            AccountReceivableStatus.PARTIAL,
          ],
        })
        .execute();

      // Agrupar por organización
      const byOrg = new Map<
        string,
        { count: number; totalAmount: number; clients: Set<string> }
      >();
      for (const account of overdueAccounts) {
        const orgId = account.organization_id;
        const existing = byOrg.get(orgId) || {
          count: 0,
          totalAmount: 0,
          clients: new Set(),
        };
        existing.count += 1;
        existing.totalAmount += Number(account.remainingAmount);
        if (account.client?.name) existing.clients.add(account.client.name);
        byOrg.set(orgId, existing);
      }

      // Para cada organización, crear notificación a todos sus usuarios
      for (const [organizationId, data] of byOrg.entries()) {
        // Verificar si ya se envió notificación hoy para esta organización
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existingToday = await this.notificationRepository
          .createQueryBuilder('n')
          .where('n.organization_id = :organizationId', { organizationId })
          .andWhere("n.metadata->>'type' = 'overdue_accounts_daily'")
          .andWhere('n.createdAt >= :start AND n.createdAt <= :end', {
            start: todayStart,
            end: todayEnd,
          })
          .getCount();

        if (existingToday > 0) {
          this.logger.log(
            `Notificación ya enviada hoy para org ${organizationId}`,
          );
          continue;
        }

        // Obtener usuarios de la organización
        const users = await this.userRepository.find({
          where: { organization_id: organizationId },
        });

        if (users.length === 0) continue;

        const clientList = Array.from(data.clients).slice(0, 3).join(', ');
        const moreClients =
          data.clients.size > 3 ? ` y ${data.clients.size - 3} más` : '';
        const amount = new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
        }).format(data.totalAmount);

        const title = `${data.count} cuenta${data.count > 1 ? 's' : ''} por cobrar vencida${data.count > 1 ? 's' : ''}`;
        const message = `Tienes ${data.count} cuenta${data.count > 1 ? 's' : ''} vencida${data.count > 1 ? 's' : ''} por un total de ${amount}. Clientes: ${clientList}${moreClients}.`;

        // Crear notificación para cada usuario
        const notifications = users.map((user) =>
          this.notificationRepository.create({
            title,
            message,
            type: NotificationType.WARNING,
            priority:
              data.count >= 5
                ? NotificationPriority.HIGH
                : NotificationPriority.MEDIUM,
            userId: user.id,
            organization_id: organizationId,
            actionUrl: '/dashboard/finanzas/cuentas-por-cobrar',
            actionLabel: 'Ver cuentas',
            metadata: {
              type: 'overdue_accounts_daily',
              count: data.count,
              totalAmount: data.totalAmount,
            },
          }),
        );

        await this.notificationRepository.save(notifications);
        this.logger.log(
          `Notificaciones enviadas a ${users.length} usuarios de org ${organizationId} — ${data.count} cuentas vencidas`,
        );
      }

      this.logger.log('Revisión de cuentas vencidas completada.');
    } catch (error) {
      this.logger.error('Error en revisión de cuentas vencidas:', error);
    }
  }
}
