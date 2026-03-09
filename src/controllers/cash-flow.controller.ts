import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CashFlowService } from '../services/cash-flow.service';
import { AuthGuard } from '../guards/auth.guard';

@Controller('cash-flow')
@UseGuards(AuthGuard)
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get('summary')
  getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cashFlowService.getCashFlowSummary(startDate, endDate);
  }

  @Get('movements')
  getMovements(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cashFlowService.getCashFlowMovements(
      startDate,
      endDate,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('projection')
  getProjection(@Query('months') months?: string) {
    return this.cashFlowService.getCashFlowProjection(
      months ? parseInt(months) : 3,
    );
  }
}
