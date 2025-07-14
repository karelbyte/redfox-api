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

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
