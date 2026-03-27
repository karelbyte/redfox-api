import { Controller, Get, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { AuthGuard } from '../guards/auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';

@Controller('admin')
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('organizations')
  getOrganizations() {
    return this.adminService.getOrganizations();
  }

  @Put('organizations/:id')
  toggleOrganization(@Param('id') id: string, @Body() body: { status: boolean }) {
    return this.adminService.toggleOrganization(id, body.status);
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('users')
  getUsers(@Query('page') page?: string) {
    return this.adminService.getUsers(page ? parseInt(page) : 1);
  }
}
