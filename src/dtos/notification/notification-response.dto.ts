import {
  NotificationType,
  NotificationPriority,
} from '../../models/notification.entity';

export class NotificationResponseDto {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
