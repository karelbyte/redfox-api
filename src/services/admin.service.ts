import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../models/organization.entity';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Subscription)
    private readonly subRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getOrganizations() {
    const [data, total] = await this.orgRepository.findAndCount({
      relations: ['subscription', 'subscription.plan'],
      order: { created_at: 'DESC' },
    });
    return { data, meta: { total } };
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
}
