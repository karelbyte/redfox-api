import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from '../models/bookmark.entity';
import { BookmarkService } from '../services/bookmark.service';
import { BookmarkController } from '../controllers/bookmark.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark])],
  providers: [BookmarkService],
  controllers: [BookmarkController],
  exports: [BookmarkService],
})
export class BookmarkModule {}
