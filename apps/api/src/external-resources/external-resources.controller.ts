import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListExternalResourcesQueryDto } from './dto/list-external-resources-query.dto';
import { ExternalResourcesService } from './external-resources.service';

@Controller('candidate/materials/external-resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CANDIDATE')
export class ExternalResourcesController {
  constructor(private readonly externalResourcesService: ExternalResourcesService) {}

  @Get()
  listCacholaResources(@Query() query: ListExternalResourcesQueryDto) {
    return this.externalResourcesService.listCacholaResources(query);
  }
}
