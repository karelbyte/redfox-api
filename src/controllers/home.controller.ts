import { Controller, Get, HttpStatus, Res, InternalServerErrorException } from '@nestjs/common';
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
      service: 'Nitro API',
    };

    return res.status(HttpStatus.OK).json(healthData);
  }

  @Get('test-error')
  testError() {
    throw new InternalServerErrorException('🚨 Este es un error provocado para probar el envío de correos por Gmail OAuth2');
  }
}
