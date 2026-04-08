import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { User } from '../models/user.entity';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Subscription)
    private readonly subRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getOrganizations() {
    const [data, total] = await this.orgRepository.findAndCount({
      relations: ['subscription', 'subscription.plan'],
      order: { created_at: 'DESC' },
    });
    return { data, meta: { total } };
  }

  async deleteOrganization(id: string) {
    // No permitir eliminar la organización landlord
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new Error('Organización no encontrada');
    if (org.slug === 'landlord')
      throw new Error(
        'No se puede eliminar la organización principal del sistema',
      );

    // Usar el Stored Procedure para una eliminación escalonada y segura (Multi-DB)
    const connectionType = this.orgRepository.manager.connection.options.type;

    if (connectionType === 'postgres') {
      await this.orgRepository.query('SELECT delete_organization_data($1)', [
        id,
      ]);
    } else {
      await this.orgRepository.query('CALL delete_organization_data(?)', [id]);
    }
  }

  async toggleOrganization(id: string, status: boolean) {
    await this.orgRepository.update(id, { status });
    return this.orgRepository.findOne({
      where: { id },
      relations: ['subscription', 'subscription.plan'],
    });
  }

  async getSubscriptions(page = 1, limit = 10, search?: string) {
    const query = this.subRepository
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.plan', 'plan')
      .leftJoinAndSelect('sub.organization', 'org')
      .where('sub.deleted_at IS NULL')
      .orderBy('sub.created_at', 'DESC');

    if (search) {
      query.andWhere(
        'LOWER(org.name) LIKE :search OR LOWER(org.slug) LIKE :search',
        {
          search: `%${search.toLowerCase()}%`,
        },
      );
    }

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createSubscription(data: {
    organization_id: string;
    plan_id: string;
    status: string;
    trial_end_date?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
  }) {
    const org = await this.orgRepository.findOne({
      where: { id: data.organization_id },
    });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const plan = await this.planRepository.findOne({
      where: { id: data.plan_id },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Si ya tiene suscripción activa, cancelar la anterior
    const existing = await this.subRepository.findOne({
      where: { organization_id: data.organization_id },
    });
    if (existing) {
      existing.status = 'cancelled';
      existing.canceled_at = new Date();
      existing.canceled_reason =
        'Reemplazada por nueva suscripción desde admin';
      await this.subRepository.save(existing);
    }

    const now = new Date();
    const trialEnd = data.trial_end_date
      ? new Date(data.trial_end_date)
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscription = this.subRepository.create({
      organization_id: data.organization_id,
      plan_id: data.plan_id,
      status: data.status,
      trial_start_date: now,
      trial_end_date: trialEnd,
      subscription_start_date: data.subscription_start_date
        ? new Date(data.subscription_start_date)
        : data.status === 'active'
          ? now
          : undefined,
      subscription_end_date: data.subscription_end_date
        ? new Date(data.subscription_end_date)
        : undefined,
    } as any);

    const saved = (await this.subRepository.save(subscription)) as any;

    // Actualizar la organización con el nuevo plan y suscripción
    await this.orgRepository.update(data.organization_id, {
      plan_id: data.plan_id,
      subscription_id: saved.id,
      status: true, // Activar la organización si estaba inactiva
    });

    return this.subRepository.findOne({
      where: { id: saved.id },
      relations: ['plan', 'organization'],
    });
  }

  async toggleUser(id: string, status: boolean) {
    await this.userRepository.update(id, { status });
    return this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'organization'],
    });
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('Usuario no encontrado');
    // No permitir eliminar el usuario master
    if (user.email === 'master@nitro.com')
      throw new Error('No se puede eliminar el usuario master del sistema');
    await this.userRepository.delete(id);
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.userRepository.findAndCount({
      relations: ['roles', 'organization'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMetrics() {
    const [totalOrganizations, totalUsers] = await Promise.all([
      this.orgRepository.count(),
      this.userRepository.count(),
    ]);

    const activeSubscriptions = await this.subRepository.count({
      where: { status: 'active' },
    });
    const trialSubscriptions = await this.subRepository.count({
      where: { status: 'trial' },
    });

    // Ingresos del mes actual (suscripciones activas * precio del plan)
    const activeSubs = await this.subRepository.find({
      where: { status: 'active' },
      relations: ['plan'],
    });
    const revenueThisMonth = activeSubs.reduce(
      (sum, s) => sum + Number(s.plan?.price ?? 0),
      0,
    );

    return {
      totalOrganizations,
      activeSubscriptions,
      trialSubscriptions,
      totalUsers,
      revenueThisMonth,
    };
  }

  async deleteSubscription(id: string) {
    const subscription = await this.subRepository.findOne({ where: { id } });
    if (!subscription) throw new NotFoundException('Suscripción no encontrada');

    // Marcar como cancelada y soft delete
    subscription.status = 'cancelled';
    subscription.canceled_at = new Date();
    subscription.canceled_reason = 'Eliminada manualmente desde admin';
    await this.subRepository.save(subscription);
    await this.subRepository.softDelete(id);

    // Limpiar la referencia en la organización
    await this.orgRepository.update(subscription.organization_id, {
      subscription_id: null as any,
    });
  }

  async updateSubscription(
    id: string,
    data: {
      plan_id?: string;
      trial_end_date?: string;
      status?: string;
      subscription_end_date?: string;
      current_period_end?: string;
    },
  ) {
    const subscription = await this.subRepository.findOne({ where: { id } });
    if (!subscription) throw new Error('Suscripción no encontrada');

    if (data.plan_id) {
      subscription.plan_id = data.plan_id;
      await this.orgRepository.update(subscription.organization_id, {
        plan_id: data.plan_id,
      });
    }

    if (data.status) {
      subscription.status = data.status;
    }

    if (data.trial_end_date) {
      const newTrialDate = new Date(data.trial_end_date);
      subscription.trial_end_date = newTrialDate;
      const now = new Date();
      if (subscription.status === 'expired' && newTrialDate > now) {
        subscription.status = 'trial';
      }
    }

    if (data.subscription_end_date) {
      subscription.subscription_end_date = new Date(data.subscription_end_date);
    }

    if (data.current_period_end) {
      subscription.current_period_end = new Date(data.current_period_end);
    }

    await this.subRepository.save(subscription);

    return this.subRepository.findOne({
      where: { id },
      relations: ['plan', 'organization'],
    });
  }

  async getAuditLogs(
    page: number,
    limit: number,
    entityType?: string,
    action?: AuditAction,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    organizationId?: string,
    search?: string,
  ) {
    return this.auditLogService.findAllGlobal(
      page,
      limit,
      entityType,
      action,
      userId,
      startDate,
      endDate,
      organizationId,
      search,
    );
  }
}
