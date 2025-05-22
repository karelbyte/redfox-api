import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { User } from '../models/user.entity';
import { RoleService } from 'src/services/role.service';
import { Role } from 'src/models/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UserController],
  providers: [UserService, RoleService],
  exports: [UserService],
})
export class UserModule {}
