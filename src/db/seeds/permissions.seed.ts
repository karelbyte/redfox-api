import { DataSource } from 'typeorm';
import { Permission } from '../../models/permission.entity';

export class PermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
      {
        code: 'audit_log_export',
        module: 'audit_logs',
        description:
          'Allows exporting audit logs | Permite exportar logs de auditoría',
      },

      {
        code: 'company_settings_module_view',
        module: 'company_settings',
        description:
          'Allows viewing the company settings module | Permite ver el módulo de configuración de empresa',
      },

      {
        code: 'bot_disconnect',
        module: 'bot',
        description:
          'Allows disconnecting the bot provider | Permite desconectar el proveedor del bot',
      },

      {
        code: 'email_config_module_view',
        module: 'email_config',
        description:
          'Allows viewing the email configuration module | Permite ver el módulo de configuración de correo',
      },

      {
        code: 'shipment_delete',
        module: 'shipments',
        description:
          'Allows deleting shipments | Permite eliminar envíos',
      },

      {
        code: 'webhooks_module_view',
        module: 'webhooks',
        description:
          'Allows viewing the webhooks module | Permite ver el módulo de webhooks',
      },
      {
        code: 'webhook_create',
        module: 'webhooks',
        description: 'Allows creating webhooks | Permite crear webhooks',
      },
      {
        code: 'webhook_read',
        module: 'webhooks',
        description: 'Allows reading webhooks | Permite leer webhooks',
      },
      {
        code: 'webhook_update',
        module: 'webhooks',
        description: 'Allows updating webhooks | Permite actualizar webhooks',
      },
      {
        code: 'webhook_delete',
        module: 'webhooks',
        description: 'Allows deleting webhooks | Permite eliminar webhooks',
      },
      {
        code: 'webhook_test',
        module: 'webhooks',
        description:
          'Allows testing webhooks | Permite probar webhooks',
      },
      {
        code: 'webhook_view_logs',
        module: 'webhooks',
        description:
          'Allows viewing webhook logs | Permite ver logs de webhooks',
      },
    ];

    console.log('🔐 Creating system permissions ...');

    for (const permission of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { code: permission.code },
      });

      if (!existingPermission) {
        await permissionRepository.save(permission);
        console.log(
          `✅ Permission created: ${permission.code} (${permission.module})`,
        );
      } else {
        console.log(
          `⏭️  Permission already exists: ${permission.code} (${permission.module})`,
        );
      }
    }

    console.log(`✅ ${permissions.length} system permissions were created`);
  }
}
