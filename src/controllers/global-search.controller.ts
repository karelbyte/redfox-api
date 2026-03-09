import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GlobalSearchService } from '../services/global-search.service';
import { AuthGuard } from '../guards/auth.guard';

@Controller('search')
@UseGuards(AuthGuard)
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  @Get()
  search(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.globalSearchService.search(query, limit ? parseInt(limit) : 20);
  }

  @Get('barcode')
  searchByBarcode(@Query('barcode') barcode: string) {
    return this.globalSearchService.searchByBarcode(barcode);
  }
}
