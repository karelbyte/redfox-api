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

      // HR Module Permissions
      {
        code: 'hr_employee_view',
        module: 'hr',
        description: 'Allows viewing employees | Permite ver empleados',
      },
      {
        code: 'hr_employee_create',
        module: 'hr',
        description: 'Allows creating employees | Permite crear empleados',
      },
      {
        code: 'hr_employee_update',
        module: 'hr',
        description: 'Allows updating employees | Permite actualizar empleados',
      },
      {
        code: 'hr_employee_delete',
        module: 'hr',
        description: 'Allows deleting employees | Permite eliminar empleados',
      },
      {
        code: 'hr_department_view',
        module: 'hr',
        description: 'Allows viewing departments | Permite ver departamentos',
      },
      {
        code: 'hr_department_create',
        module: 'hr',
        description: 'Allows creating departments | Permite crear departamentos',
      },
      {
        code: 'hr_department_update',
        module: 'hr',
        description: 'Allows updating departments | Permite actualizar departamentos',
      },
      {
        code: 'hr_department_delete',
        module: 'hr',
        description: 'Allows deleting departments | Permite eliminar departamentos',
      },
      {
        code: 'hr_position_view',
        module: 'hr',
        description: 'Allows viewing positions | Permite ver puestos',
      },
      {
        code: 'hr_position_create',
        module: 'hr',
        description: 'Allows creating positions | Permite crear puestos',
      },
      {
        code: 'hr_position_update',
        module: 'hr',
        description: 'Allows updating positions | Permite actualizar puestos',
      },
      {
        code: 'hr_position_delete',
        module: 'hr',
        description: 'Allows deleting positions | Permite eliminar puestos',
      },
      {
        code: 'hr_attendance_view',
        module: 'hr',
        description: 'Allows viewing attendance | Permite ver asistencia',
      },
      {
        code: 'hr_attendance_create',
        module: 'hr',
        description: 'Allows creating attendance records | Permite crear registros de asistencia',
      },
      {
        code: 'hr_attendance_update',
        module: 'hr',
        description: 'Allows updating attendance records | Permite actualizar registros de asistencia',
      },
      {
        code: 'hr_attendance_delete',
        module: 'hr',
        description: 'Allows deleting attendance records | Permite eliminar registros de asistencia',
      },
      {
        code: 'hr_leave_request_view',
        module: 'hr',
        description: 'Allows viewing leave requests | Permite ver solicitudes de ausencia',
      },
      {
        code: 'hr_leave_request_create',
        module: 'hr',
        description: 'Allows creating leave requests | Permite crear solicitudes de ausencia',
      },
      {
        code: 'hr_leave_request_update',
        module: 'hr',
        description: 'Allows updating leave requests | Permite actualizar solicitudes de ausencia',
      },
      {
        code: 'hr_leave_request_delete',
        module: 'hr',
        description: 'Allows deleting leave requests | Permite eliminar solicitudes de ausencia',
      },
      {
        code: 'hr_leave_request_approve',
        module: 'hr',
        description: 'Allows approving leave requests | Permite aprobar solicitudes de ausencia',
      },
      {
        code: 'hr_payroll_view',
        module: 'hr',
        description: 'Allows viewing payroll | Permite ver nómina',
      },
      {
        code: 'hr_payroll_create',
        module: 'hr',
        description: 'Allows creating payroll | Permite crear nómina',
      },
      {
        code: 'hr_payroll_update',
        module: 'hr',
        description: 'Allows updating payroll | Permite actualizar nómina',
      },
      {
        code: 'hr_payroll_delete',
        module: 'hr',
        description: 'Allows deleting payroll | Permite eliminar nómina',
      },
      {
        code: 'hr_document_view',
        module: 'hr',
        description: 'Allows viewing employee documents | Permite ver documentos de empleados',
      },
      {
        code: 'hr_document_create',
        module: 'hr',
        description: 'Allows creating employee documents | Permite crear documentos de empleados',
      },
      {
        code: 'hr_document_update',
        module: 'hr',
        description: 'Allows updating employee documents | Permite actualizar documentos de empleados',
      },
      {
        code: 'hr_document_delete',
        module: 'hr',
        description: 'Allows deleting employee documents | Permite eliminar documentos de empleados',
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
