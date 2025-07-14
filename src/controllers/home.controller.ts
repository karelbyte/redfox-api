import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

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
  getHealth(@Res() res: Response) {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      service: 'RedFox API',
    };

    return res.status(HttpStatus.OK).json(healthData);
  }
}
