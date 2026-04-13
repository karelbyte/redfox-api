import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In } from 'typeorm';
import { Shipment, ShipmentStatus } from '../models/shipment.entity';
import { ShipmentNotificationService } from './shipment-notification.service';

@Injectable()
export class ShipmentSchedulerService {
  private readonly logger = new Logger(ShipmentSchedulerService.name);

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    private readonly shipmentNotificationService: ShipmentNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDelayedShipments() {
    this.logger.log('Iniciando revisión de envíos retrasados...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const delayedShipments = await this.shipmentRepository.find({
        where: {
          estimated_delivery_date: LessThan(today),
          status: Not(In([
            ShipmentStatus.DELIVERED,
            ShipmentStatus.RETURNED,
            ShipmentStatus.FAILED
          ]))
        },
        relations: ['withdrawal', 'withdrawal.client']
      });

      if (delayedShipments.length === 0) {
        this.logger.log('No hay envíos retrasados.');
        return;
      }

      await this.shipmentNotificationService.notifyDelayedShipments(delayedShipments);
      this.logger.log(`Avisos de retraso enviados para ${delayedShipments.length} envíos.`);
    } catch (error) {
      this.logger.error('Error en revisión de envíos retrasados:', error);
    }
  }
}
