import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
} from '../../models/notification.entity';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.LOW;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actionUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionLabel?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
