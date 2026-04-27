import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Shipment, ShipmentStatus } from '../models/shipment.entity';
import { Withdrawal, WithdrawalStatus } from '../models/withdrawal.entity';
import { ClientAddress } from '../models/client-address.entity';
import { CreateShipmentDto } from '../dtos/shipment/create-shipment.dto';
import { UpdateShipmentDto } from '../dtos/shipment/update-shipment.dto';
import { ShipmentResponseDto } from '../dtos/shipment/shipment-response.dto';
import { ShipmentQueryDto } from '../dtos/shipment/shipment-query.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';
import { ShipmentNotificationService } from './shipment-notification.service';
import { UserAttributionService } from './user-attribution.service';

@Injectable()
export class ShipmentService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(ClientAddress)
    private readonly addressRepository: Repository<ClientAddress>,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
    private readonly shipmentNotificationService: ShipmentNotificationService,
    private readonly userAttributionService: UserAttributionService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapToResponseDto(shipment: Shipment): ShipmentResponseDto {
    return {
      id: shipment.id,
      withdrawal_id: shipment.withdrawal_id,
      organization_id: shipment.organization_id,
      shipping_address_id: shipment.shipping_address_id,
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
      shipping_cost: Number(shipment.shipping_cost),
      status: shipment.status,
      estimated_delivery_date: shipment.estimated_delivery_date,
      shipped_at: shipment.shipped_at,
      delivered_at: shipment.delivered_at,
      notes: shipment.notes,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
    };
  }

  async getAnalytics() {
    const qb = this.shipmentRepository
      .createQueryBuilder('s')
      .where('s.organization_id = :orgId', { orgId: this.organizationId });

    const [total, byStatus, avgCost, delivered] = await Promise.all([
      qb.getCount(),
      this.shipmentRepository
        .createQueryBuilder('s')
        .select('s.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('s.organization_id = :orgId', { orgId: this.organizationId })
        .groupBy('s.status')
        .getRawMany(),
      this.shipmentRepository
        .createQueryBuilder('s')
        .select('AVG(s.shipping_cost)', 'avg')
        .where('s.organization_id = :orgId', { orgId: this.organizationId })
        .getRawOne(),
      this.shipmentRepository
        .createQueryBuilder('s')
        .select('AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at)) / 86400)', 'avg_days')
        .where('s.organization_id = :orgId', { orgId: this.organizationId })
        .andWhere('s.status = :status', { status: 'DELIVERED' })
        .andWhere('s.shipped_at IS NOT NULL')
        .andWhere('s.delivered_at IS NOT NULL')
        .getRawOne(),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) {
      statusMap[row.status] = parseInt(row.count, 10);
    }

    return {
      total,
      by_status: statusMap,
      avg_shipping_cost: parseFloat(avgCost?.avg || '0'),
      avg_delivery_days: parseFloat(delivered?.avg_days || '0'),
    };
  }

  async create(createShipmentDto: CreateShipmentDto, userId?: string): Promise<ShipmentResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: createShipmentDto.withdrawal_id, organization_id: this.organizationId },
    });

    if (!withdrawal) {
      const message = await this.translationService.translate('withdrawal.not_found', userId, { id: createShipmentDto.withdrawal_id });
      throw new NotFoundException(message);
    }

    if (withdrawal.status === WithdrawalStatus.RETURNED) {
      throw new BadRequestException('Cannot create a shipment for a returned withdrawal');
    }

    if (createShipmentDto.shipping_address_id) {
      const address = await this.addressRepository.findOne({
         where: { id: createShipmentDto.shipping_address_id, client_id: withdrawal.client?.id }
      });
    }

    const shipment = this.shipmentRepository.create({
      ...createShipmentDto,
      organization_id: this.organizationId,
      status: ShipmentStatus.PENDING,
      created_by: userId || null,
    });

    const savedShipment = await this.shipmentRepository.save(shipment);
    return this.mapToResponseDto(savedShipment);
  }

  async findAllGlobal(queryDto: ShipmentQueryDto, userId?: string): Promise<PaginatedResponse<ShipmentResponseDto>> {
    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;

    let authorizedWarehouseIds: string[] = [];
    if (userId) {
      authorizedWarehouseIds = await this.userAttributionService.getAuthorizedWarehouseIds(userId);
    }

    const queryBuilder = this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.withdrawal', 'withdrawal')
      .leftJoinAndSelect('withdrawal.details', 'details')
      .leftJoinAndSelect('details.warehouse', 'warehouse')
      .where('shipment.organization_id = :organizationId', { organizationId: this.organizationId })
      .orderBy('shipment.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('shipment.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(shipment.carrier ILIKE :search OR shipment.tracking_number ILIKE :search OR CAST(withdrawal.id AS TEXT) ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [shipments, total] = await queryBuilder.getManyAndCount();

    let filteredShipments = shipments;
    if (userId && authorizedWarehouseIds.length > 0) {
      filteredShipments = shipments.filter((shipment) => {
        if (!shipment.withdrawal || !shipment.withdrawal.details || shipment.withdrawal.details.length === 0) {
          return false;
        }
        return shipment.withdrawal.details.some((detail) => {
          if (!detail.warehouse) {
            return false;
          }
          return authorizedWarehouseIds.includes(detail.warehouse.id);
        });
      });
    } else if (userId) {
      filteredShipments = [];
    }

    return {
      data: filteredShipments.map(shipment => this.mapToResponseDto(shipment)),
      meta: {
        total: userId ? filteredShipments.length : total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((userId ? filteredShipments.length : total) / limit),
      },
    };
  }

  async findAllByWithdrawal(withdrawalId: string, userId?: string): Promise<ShipmentResponseDto[]> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, organization_id: this.organizationId },
    });

    if (!withdrawal) {
      const message = await this.translationService.translate('withdrawal.not_found', userId, { id: withdrawalId });
      throw new NotFoundException(message);
    }

    const shipments = await this.shipmentRepository.find({
      where: { withdrawal_id: withdrawalId, organization_id: this.organizationId },
      order: { created_at: 'DESC' },
    });

    return shipments.map(shipment => this.mapToResponseDto(shipment));
  }

  async findOne(id: string, userId?: string): Promise<ShipmentResponseDto> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });

    if (!shipment) {
      const message = await this.translationService.translate('shipment.not_found', userId, { id });
      throw new NotFoundException(message || 'Shipment not found');
    }

    return this.mapToResponseDto(shipment);
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto, userId?: string): Promise<ShipmentResponseDto> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['withdrawal', 'withdrawal.client'],
    });

    if (!shipment) {
      const message = await this.translationService.translate('shipment.not_found', userId, { id });
      throw new NotFoundException(message || 'Shipment not found');
    }

    const oldStatus = shipment.status;
    Object.assign(shipment, updateShipmentDto);

    if (updateShipmentDto.status === ShipmentStatus.SHIPPED && !shipment.shipped_at) {
      shipment.shipped_at = new Date();
    } else if (updateShipmentDto.status === ShipmentStatus.DELIVERED && !shipment.delivered_at) {
      shipment.delivered_at = new Date();
    }

    const updatedShipment = await this.shipmentRepository.save(shipment);

    if (updateShipmentDto.status && updateShipmentDto.status !== oldStatus) {
      void this.shipmentNotificationService.notifyStatusChange(updatedShipment);
    }

    return this.mapToResponseDto(updatedShipment);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });

    if (!shipment) {
      const message = await this.translationService.translate('shipment.not_found', userId, { id });
      throw new NotFoundException(message || 'Shipment not found');
    }

    await this.shipmentRepository.softRemove(shipment);
  }
}
