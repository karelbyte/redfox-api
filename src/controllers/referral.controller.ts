import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ReferralService } from '../services/referral.service';
import { AuthGuard } from '../guards/auth.guard';

@Controller('admin/referrals')
@UseGuards(AuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ── Referrers ──────────────────────────────────────────────

  @Get('referrers')
  getReferrers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.referralService.getReferrers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('referrers/:id')
  getReferrer(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralService.getReferrer(id);
  }

  @Post('referrers')
  createReferrer(@Body() body: {
    name: string; email?: string; phone?: string;
    type?: 'internal' | 'external'; user_id?: string;
    commission_rate?: number; notes?: string;
  }) {
    return this.referralService.createReferrer(body);
  }

  @Put('referrers/:id')
  updateReferrer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ name: string; email: string; phone: string; commission_rate: number; is_active: boolean; notes: string }>,
  ) {
    return this.referralService.updateReferrer(id, body);
  }

  @Delete('referrers/:id')
  deleteReferrer(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralService.deleteReferrer(id);
  }

  // ── Commissions ────────────────────────────────────────────

  @Get('commissions')
  getCommissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('referrerId') referrerId?: string,
  ) {
    return this.referralService.getCommissions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      referrerId,
    );
  }

  @Put('commissions/:id/status')
  updateCommissionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'approved' | 'paid'; payment_notes?: string },
  ) {
    return this.referralService.updateCommissionStatus(id, body.status, body.payment_notes);
  }

  @Get('stats')
  getStats() {
    return this.referralService.getStats();
  }

  // ── Validación pública (registro) ─────────────────────────

  @Get('validate/:code')
  validateCode(@Param('code') code: string) {
    return this.referralService.validateCode(code);
  }
}
