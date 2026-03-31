import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
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
    if (org.slug === 'landlord') throw new Error('No se puede eliminar la organización principal del sistema');

    // Usar el Stored Procedure para una eliminación escalonada y segura (Multi-DB)
    const connectionType = this.orgRepository.manager.connection.options.type;
    
    if (connectionType === 'postgres') {
      await this.orgRepository.query('SELECT delete_organization_data($1)', [id]);
    } else {
      await this.orgRepository.query('CALL delete_organization_data(?)', [id]);
    }
  }

  async toggleOrganization(id: string, status: boolean) {
    await this.orgRepository.update(id, { status });
    return this.orgRepository.findOne({ where: { id }, relations: ['subscription', 'subscription.plan'] });
  }

  async getSubscriptions() {
    const [data, total] = await this.subRepository.findAndCount({
      relations: ['plan', 'organization'],
      order: { created_at: 'DESC' },
    });
    return { data, meta: { total } };
  }

  async toggleUser(id: string, status: boolean) {
    await this.userRepository.update(id, { status });
    return this.userRepository.findOne({ where: { id }, relations: ['roles', 'organization'] });
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('Usuario no encontrado');
    // No permitir eliminar el usuario master
    if (user.email === 'master@nitro.com') throw new Error('No se puede eliminar el usuario master del sistema');
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
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getMetrics() {
    const [totalOrganizations, totalUsers] = await Promise.all([
      this.orgRepository.count(),
      this.userRepository.count(),
    ]);

    const activeSubscriptions = await this.subRepository.count({ where: { status: 'active' } });
    const trialSubscriptions = await this.subRepository.count({ where: { status: 'trial' } });

    // Ingresos del mes actual (suscripciones activas * precio del plan)
    const activeSubs = await this.subRepository.find({
      where: { status: 'active' },
      relations: ['plan'],
    });
    const revenueThisMonth = activeSubs.reduce((sum, s) => sum + Number(s.plan?.price ?? 0), 0);

    return { totalOrganizations, activeSubscriptions, trialSubscriptions, totalUsers, revenueThisMonth };
  }

  async updateSubscription(id: string, data: { plan_id?: string; trial_end_date?: string }) {
    const subscription = await this.subRepository.findOne({ where: { id } });
    if (!subscription) throw new Error('Suscripción no encontrada');

    if (data.plan_id) {
      subscription.plan_id = data.plan_id;
      // Actualizar también la referencia a nivel organización
      await this.orgRepository.update(subscription.organization_id, { plan_id: data.plan_id });
    }

    if (data.trial_end_date) {
      const newTrialDate = new Date(data.trial_end_date);
      subscription.trial_end_date = newTrialDate;
      const now = new Date();
      // Si el trial está en el futuro y estaba 'expired', pasarlo a 'trial' nuevamente
      if (subscription.status === 'expired' && newTrialDate > now) {
        subscription.status = 'trial';
      }
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
    return this.auditLogService.findAllGlobal(page, limit, entityType, action, userId, startDate, endDate, organizationId, search);
  }
}
