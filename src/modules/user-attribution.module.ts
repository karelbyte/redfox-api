import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAttribution } from '../models/user-attribution.entity';
import { User } from '../models/user.entity';
import { UserAttributionService } from '../services/user-attribution.service';
import { UserAttributionController } from '../controllers/user-attribution.controller';
import { LanguageModule } from './language.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserAttribution, User]), LanguageModule],
  controllers: [UserAttributionController],
  providers: [UserAttributionService],
  exports: [UserAttributionService],
})
export class UserAttributionModule {}
