import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { RegisterDto } from '../dtos/auth/register.dto';
import { AuthResponseDto } from '../dtos/auth/auth-response.dto';
import { Public } from '../decorators/public.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { RedisService } from '../services/redis.service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserId } from '../decorators/user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<void> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('activate')
  async activate(
    @Body() body: { token: string },
  ): Promise<{ message: string; alreadyActive: boolean }> {
    return this.authService.activate(body.token);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }): Promise<void> {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; password: string },
  ): Promise<void> {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: Request): Promise<{ message: string }> {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const payload = this.jwtService.decode(token);
        const ttl = payload?.exp
          ? payload.exp - Math.floor(Date.now() / 1000)
          : 3600; // 1h por defecto
        if (ttl > 0) {
          await this.redisService.blacklistToken(token, ttl);
        }
      } catch {
        /* ignorar errores de decode */
      }
    }
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@UserId() userId: string): Promise<AuthResponseDto['user']> {
    return this.authService.getCurrentUser(userId);
  }
}
