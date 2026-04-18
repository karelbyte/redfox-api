import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales')
  async getSalesAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getSalesAnalytics(startDate, endDate);
  }

  @Get('inventory')
  async getInventoryAnalytics() {
    return this.analyticsService.getInventoryAnalytics();
  }

  @Get('financial')
  async getFinancialAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getFinancialAnalytics(startDate, endDate);
  }

  @Get('operational')
  async getOperationalAnalytics() {
    return this.analyticsService.getOperationalAnalytics();
  }

  @Get('extended')
  async getExtendedAnalytics() {
    return this.analyticsService.getExtendedAnalytics();
  }

  @Get('dashboard')
  async getDashboardData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const [sales, inventory, financial, operational] = await Promise.all([
      this.analyticsService.getSalesAnalytics(startDate, endDate),
      this.analyticsService.getInventoryAnalytics(),
      this.analyticsService.getFinancialAnalytics(startDate, endDate),
      this.analyticsService.getOperationalAnalytics(),
    ]);

    return {
      sales,
      inventory,
      financial,
      operational,
    };
  }

  @Get('sales-forecasting')
  async getSalesForecasting() {
    return this.analyticsService.getSalesForecasting();
  }

  @Get('product-profitability')
  async getProductProfitability() {
    return this.analyticsService.getProductProfitability();
  }

  @Get('month-over-month')
  async getMonthOverMonthComparison() {
    return this.analyticsService.getMonthOverMonthComparison();
  }
}
