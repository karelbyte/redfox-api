import { Controller, Get } from '@nestjs/common';

@Controller()
export class HomeController {
  @Get()
  getHome() {
    return {
      message: 'Todas las request se atienden por /api',
      status: 'success',
    };
  }
}
