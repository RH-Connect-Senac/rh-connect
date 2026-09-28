import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListExternalResourcesQueryDto,
  SUPPORTED_EXTERNAL_RESOURCE_SOURCES,
} from './dto/list-external-resources-query.dto';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

@Injectable()
export class ExternalResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listExternalResources(query: ListExternalResourcesQueryDto) {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Com `source` informado (já validado pelo DTO contra
    // SUPPORTED_EXTERNAL_RESOURCE_SOURCES), filtra exclusivamente aquela
    // fonte. Sem `source`, preserva o comportamento multi-fonte da Etapa 2:
    // todas as fontes suportadas. Em ambos os casos é uma única consulta.
    const where: Prisma.external_learning_resourceWhereInput = {
      source: query.source ? query.source : { in: [...SUPPORTED_EXTERNAL_RESOURCE_SOURCES] },
      is_active: true,
    };

    if (query.area) {
      where.area = query.area;
    }

    if (query.type) {
      where.resource_type = query.type;
    }

    const resources = await this.prisma.external_learning_resource.findMany({
      where,
      orderBy: [{ area: 'asc' }, { title: 'asc' }],
      take: limit,
    });

    return {
      resources: resources.map((resource) => ({
        id: resource.resource_id,
        source: resource.source,
        title: resource.title,
        resourceType: resource.resource_type,
        section: resource.section,
        area: resource.area,
        url: resource.url,
        coverUrl: resource.cover_url,
        directLinkAvailable: resource.direct_link_available,
      })),
    };
  }
}
