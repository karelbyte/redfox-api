import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalNote } from '../models/internal-note.entity';
import { InternalNoteService } from '../services/internal-note.service';
import { InternalNoteController } from '../controllers/internal-note.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InternalNote])],
  providers: [InternalNoteService],
  controllers: [InternalNoteController],
  exports: [InternalNoteService],
})
export class InternalNoteModule {}
