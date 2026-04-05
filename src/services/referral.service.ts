import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referrer } from '../models/referrer.entity';
import { ReferralCommission } from '../models/referral-commission.entity';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REF-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referrer)
    private referrerRepo: Repository<Referrer>,
    @InjectRepository(ReferralCommission)
    private commissionRepo: Repository<ReferralCommission>,
  ) {}

  // ── Referrers ──────────────────────────────────────────────

  async getReferrers(page = 1, limit = 20, search?: string) {
    const qb = this.referrerRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.commissions', 'c')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('LOWER(r.name) LIKE :s OR LOWER(r.code) LIKE :s OR LOWER(r.email) LIKE :s', {
        s: `%${search.toLowerCase()}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getReferrer(id: string) {
    const r = await this.referrerRepo.findOne({ where: { id }, relations: ['commissions', 'commissions.organization'] });
    if (!r) throw new NotFoundException('Referente no encontrado');
    return r;
  }

  async createReferrer(data: {
    name: string; email?: string; phone?: string;
    type?: 'internal' | 'external'; user_id?: string;
    commission_rate?: number; notes?: string;
  }) {
    // Generar código único
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) throw new BadRequestException('No se pudo generar un código único');
    } while (await this.referrerRepo.findOne({ where: { code } }));

    const referrer = this.referrerRepo.create({ ...data, code });
    return this.referrerRepo.save(referrer);
  }

  async updateReferrer(id: string, data: Partial<{
    name: string; email: string; phone: string;
    commission_rate: number; is_active: boolean; notes: string;
  }>) {
    const r = await this.referrerRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Referente no encontrado');
    Object.assign(r, data);
    return this.referrerRepo.save(r);
  }

  async deleteReferrer(id: string) {
    const r = await this.referrerRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Referente no encontrado');
    const hasCommissions = await this.commissionRepo.count({ where: { referrer_id: id } });
    if (hasCommissions > 0) throw new BadRequestException('No se puede eliminar un referente con comisiones registradas');
    await this.referrerRepo.remove(r);
  }

  async validateCode(code: string) {
    const r = await this.referrerRepo.findOne({ where: { code, is_active: true } });
    return r ? { valid: true, referrer: { id: r.id, name: r.name, code: r.code } } : { valid: false };
  }

  // ── Commissions ────────────────────────────────────────────

  async getCommissions(page = 1, limit = 20, status?: string, referrerId?: string) {
    const qb = this.commissionRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.referrer', 'r')
      .leftJoinAndSelect('c.organization', 'o')
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('c.status = :status', { status });
    if (referrerId) qb.andWhere('c.referrer_id = :referrerId', { referrerId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createCommission(data: {
    referrer_id: string; organization_id: string;
    subscription_payment_id?: string; plan_name?: string;
    plan_price: number; commission_rate: number; commission_amount: number;
  }) {
    const commission = this.commissionRepo.create(data);
    return this.commissionRepo.save(commission);
  }

  async updateCommissionStatus(id: string, status: 'approved' | 'paid', payment_notes?: string) {
    const c = await this.commissionRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Comisión no encontrada');
    c.status = status;
    if (status === 'paid') c.paid_at = new Date();
    if (payment_notes) c.payment_notes = payment_notes;
    return this.commissionRepo.save(c);
  }

  async getStats() {
    const total = await this.commissionRepo.count();
    const pending = await this.commissionRepo.count({ where: { status: 'pending' } });
    const approved = await this.commissionRepo.count({ where: { status: 'approved' } });
    const paid = await this.commissionRepo.count({ where: { status: 'paid' } });

    const totalAmount = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .getRawOne();

    const paidAmount = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.status = :s', { s: 'paid' })
      .getRawOne();

    return {
      total, pending, approved, paid,
      totalAmount: Number(totalAmount?.total ?? 0),
      paidAmount: Number(paidAmount?.total ?? 0),
    };
  }

  // Llamado desde subscription.service al confirmar un pago
  async generateCommissionForPayment(data: {
    organizationId: string; referrerCode: string;
    subscriptionPaymentId?: string; planName: string; planPrice: number;
  }) {
    const referrer = await this.referrerRepo.findOne({
      where: { code: data.referrerCode, is_active: true },
    });
    if (!referrer) return null;

    const rate = Number(referrer.commission_rate);
    const amount = (data.planPrice * rate) / 100;

    return this.createCommission({
      referrer_id: referrer.id,
      organization_id: data.organizationId,
      subscription_payment_id: data.subscriptionPaymentId,
      plan_name: data.planName,
      plan_price: data.planPrice,
      commission_rate: rate,
      commission_amount: amount,
    });
  }

  // ── Endpoints para el usuario logueado ────────────────────

  async getOrCreateMyCode(userId: string, userName: string, userEmail?: string): Promise<Referrer> {
    // Buscar si ya tiene un referente vinculado
    let referrer = await this.referrerRepo.findOne({ where: { user_id: userId } });
    if (referrer) return referrer;

    // Crear uno nuevo automáticamente
    return this.createReferrer({
      name: userName,
      email: userEmail,
      type: 'internal',
      user_id: userId,
      commission_rate: 10,
    });
  }

  async getMyCommissions(userId: string) {
    const referrer = await this.referrerRepo.findOne({ where: { user_id: userId } });
    if (!referrer) return { referrer: null, commissions: [], stats: { total: 0, pending: 0, approved: 0, paid: 0, totalAmount: 0, paidAmount: 0 } };

    const commissions = await this.commissionRepo.find({
      where: { referrer_id: referrer.id },
      relations: ['organization'],
      order: { created_at: 'DESC' },
    });

    const stats = {
      total: commissions.length,
      pending: commissions.filter(c => c.status === 'pending').length,
      approved: commissions.filter(c => c.status === 'approved').length,
      paid: commissions.filter(c => c.status === 'paid').length,
      totalAmount: commissions.reduce((s, c) => s + Number(c.commission_amount), 0),
      paidAmount: commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0),
    };

    return { referrer, commissions, stats };
  }
}
