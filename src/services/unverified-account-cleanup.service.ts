import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserService } from '../services/user.service';
import { OrganizationService } from '../services/organization.service';

@Injectable()
export class UnverifiedAccountCleanupService {
  private readonly logger = new Logger(UnverifiedAccountCleanupService.name);

  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupUnverifiedAccounts() {
    this.logger.log('Iniciando limpieza de cuentas no verificadas...');

    // Calcular la fecha límite (hace 3 días aprox 72 horas)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    try {
      // 1. Encontrar usuarios no verificados
      const unverifiedUsers =
        await this.userService.findUnverifiedOlderThan(cutoffDate);

      this.logger.log(
        `Se encontraron ${unverifiedUsers.length} usuarios no verificados para eliminar.`,
      );

      // Extraer los IDs de las organizaciones para borrarlas después de los usuarios
      // (asumiendo que las organizaciones también están no verificadas y no tienen otros usuarios)
      const organizationIdsToDelete = new Set<string>();

      for (const user of unverifiedUsers) {
        if (user.organization_id) {
          organizationIdsToDelete.add(user.organization_id);
        }

        // Borrado duro del usuario para asegurar limpieza
        await this.userService.hardDelete(user.id);
        this.logger.debug(
          `Usuario no verificado eliminado: ${user.id} (${user.email})`,
        );
      }

      // 2. Eliminar las organizaciones huérfanas/no verificadas
      if (organizationIdsToDelete.size > 0) {
        for (const orgId of organizationIdsToDelete) {
          // Asegurarnos de que realmente sea una organización que necesita borrado
          const org = await this.organizationService.findOne(orgId);
          if (org && !org.status) {
            await this.organizationService.remove(orgId);
            this.logger.debug(`Organización no verificada eliminada: ${orgId}`);
          }
        }
      }

      this.logger.log('Limpieza de cuentas completada satisfactoriamente.');
    } catch (error) {
      this.logger.error(
        'Error durante la limpieza de cuentas no verificadas',
        error,
      );
    }
  }
}
