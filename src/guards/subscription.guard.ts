import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization not found');
    }

    const isActive =
      await this.subscriptionService.isSubscriptionActive(organizationId);

    if (!isActive) {
      throw new ForbiddenException(
        'Your subscription has expired. Please renew your subscription to continue.',
      );
    }

    return true;
  }
}
