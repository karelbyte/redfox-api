import {
  Controller,
  Get,
  HttpStatus,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { TranslationService } from '../services/translation.service';

@Controller()
export class HomeController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  async getHome() {
    const message = await this.translationService.translateWithLanguage('home.welcome_message', 'es');
    return {
      message,
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
  async testError() {
    const message = await this.translationService.translateWithLanguage('home.test_error_message', 'es');
    throw new InternalServerErrorException(message);
  }
}
