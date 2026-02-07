import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '../models/template.entity';
import { TemplateService } from '../services/template.service';
import { TemplateController } from '../controllers/template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Template])],
  providers: [TemplateService],
  controllers: [TemplateController],
  exports: [TemplateService],
})
export class TemplateModule {}
