import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../models/tag.entity';
import { TagService } from '../services/tag.service';
import { TagController } from '../controllers/tag.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  providers: [TagService],
  controllers: [TagController],
  exports: [TagService],
})
export class TagModule {}
