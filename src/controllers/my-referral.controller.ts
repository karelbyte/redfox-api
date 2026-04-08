import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReferralService } from '../services/referral.service';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';

@Controller('referrals/me')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class MyReferralController {
  constructor(
    private readonly referralService: ReferralService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get('code')
  async getMyCode(@UserId() userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return this.referralService.getOrCreateMyCode(
      userId,
      user?.name ?? 'Usuario',
      user?.email,
    );
  }

  @Get('commissions')
  async getMyCommissions(@UserId() userId: string) {
    return this.referralService.getMyCommissions(userId);
  }
}
