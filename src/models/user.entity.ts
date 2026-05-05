import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Organization } from './organization.entity';
import { Employee } from './employee.entity';
import { LeaveRequest } from './leave-request.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 100 })
  password: string;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @Column({ default: true })
  status: boolean;

  
  @Column({ default: false })
  onboarding_completed: boolean;

  @Column({ default: false })
  admin: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  /**
   * Obtiene todos los permisos únicos del usuario basándose en sus roles
   * @returns Array de permisos únicos
   */
  getPermissions(): Permission[] {
    if (!this.roles || this.roles.length === 0) {
      return [];
    }

    const permissionsMap = new Map<string, Permission>();

    this.roles.forEach((role) => {
      if (role.rolePermissions && role.rolePermissions.length > 0) {
        role.rolePermissions.forEach((rolePermission) => {
          if (rolePermission.permission) {
            permissionsMap.set(
              rolePermission.permission.id,
              rolePermission.permission,
            );
          }
        });
      }
    });

    return Array.from(permissionsMap.values());
  }

  /**
   * Obtiene los códigos de permisos únicos del usuario de todos sus roles
   * @returns Array de códigos de permisos únicos
   */
  getPermissionCodes(): string[] {
    if (!this.roles || this.roles.length === 0) {
      return [];
    }

    const permissionCodesSet = new Set<string>();

    this.roles.forEach((role) => {
      if (role.rolePermissions && role.rolePermissions.length > 0) {
        role.rolePermissions.forEach((rolePermission) => {
          if (rolePermission.permission && rolePermission.permission.code) {
            permissionCodesSet.add(rolePermission.permission.code);
          }
        });
      }
    });

    return Array.from(permissionCodesSet);
  }

  /**
   * Obtiene las descripciones de permisos únicos del usuario de todos sus roles
   * @returns Array de descripciones de permisos únicos
   */
  getPermissionDescriptions(): string[] {
    if (!this.roles || this.roles.length === 0) {
      return [];
    }

    const permissionDescriptionsSet = new Set<string>();

    this.roles.forEach((role) => {
      if (role.rolePermissions && role.rolePermissions.length > 0) {
        role.rolePermissions.forEach((rolePermission) => {
          if (
            rolePermission.permission &&
            rolePermission.permission.description
          ) {
            permissionDescriptionsSet.add(
              rolePermission.permission.description,
            );
          }
        });
      }
    });

    return Array.from(permissionDescriptionsSet);
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permissionCode - Código del permiso a verificar
   * @returns true si el usuario tiene el permiso, false en caso contrario
   */
  hasPermission(permissionCode: string): boolean {
    if (this.admin) return true;
    return this.getPermissionCodes().includes(permissionCode);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   * @param permissionCodes - Array de códigos de permisos a verificar
   * @returns true si el usuario tiene al menos uno de los permisos, false en caso contrario
   */
  hasAnyPermission(permissionCodes: string[]): boolean {
    if (this.admin) return true;
    const userPermissions = this.getPermissionCodes();
    return permissionCodes.some((code) => userPermissions.includes(code));
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param permissionCodes - Array de códigos de permisos a verificar
   * @returns true si el usuario tiene todos los permisos, false en caso contrario
   */
  hasAllPermissions(permissionCodes: string[]): boolean {
    if (this.admin) return true;
    const userPermissions = this.getPermissionCodes();
    return permissionCodes.every((code) => userPermissions.includes(code));
  }
}
