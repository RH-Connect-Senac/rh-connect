import { Controller, Get, Query } from '@nestjs/common';
import { ListExternalResourcesQueryDto } from './dto/list-external-resources-query.dto';
import { ExternalResourcesService } from './external-resources.service';

@Controller('candidate/materials/external-resources')
export class ExternalResourcesController {
  constructor(private readonly externalResourcesService: ExternalResourcesService) {}

  @Get()
  listExternalResources(@Query() query: ListExternalResourcesQueryDto) {
    return this.externalResourcesService.listExternalResources(query);
  }
}
