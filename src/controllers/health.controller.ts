import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get()
  getRoot() {
    return {
      message: 'RedFox API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
} 