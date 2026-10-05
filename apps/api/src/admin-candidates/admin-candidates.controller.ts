import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCandidatesService } from './admin-candidates.service';

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('ADMIN')` fica em cada rota.
@Controller('admin/candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCandidatesController {
  constructor(
    private readonly adminCandidatesService: AdminCandidatesService,
  ) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.adminCandidatesService.list();
  }

  @Get(':id')
  @Roles('ADMIN')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminCandidatesService.getById(id);
  }
}
