import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('ADMIN')` fica na rota. Somente leitura: sem body, sem query e
// sem qualquer identidade vinda do cliente.
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @Roles('ADMIN')
  getDashboard() {
    return this.adminDashboardService.getDashboard();
  }
}
