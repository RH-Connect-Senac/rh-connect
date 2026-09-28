import { Controller, Get, Query } from '@nestjs/common';
import { ListExternalResourceCategoriesQueryDto } from './dto/list-external-resource-categories-query.dto';
import { ListExternalResourcesQueryDto } from './dto/list-external-resources-query.dto';
import { ExternalResourcesService } from './external-resources.service';

@Controller('candidate/materials/external-resources')
export class ExternalResourcesController {
  constructor(private readonly externalResourcesService: ExternalResourcesService) {}

  @Get()
  listExternalResources(@Query() query: ListExternalResourcesQueryDto) {
    return this.externalResourcesService.listExternalResources(query);
  }

  // Rota estática ("categories") declarada depois da rota-base: como nenhuma
  // das duas usa parâmetro/curinga, não há ambiguidade de matching no Nest,
  // e a rota de listagem de recursos acima permanece exatamente como era.
  @Get('categories')
  listExternalResourceCategories(@Query() query: ListExternalResourceCategoriesQueryDto) {
    return this.externalResourcesService.listExternalResourceCategories(query);
  }
}
