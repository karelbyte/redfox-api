import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { UserModule } from './user.module';
import { AppConfig } from 'src/config';

@Module({
  imports: [
    UserModule,
    JwtModule.register({
      secret:
        AppConfig().appKey || 'KXeDTEe7Quf1O96kqtQvT3nnSVEYA5zwJ.QAE9Kju6Yq',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
