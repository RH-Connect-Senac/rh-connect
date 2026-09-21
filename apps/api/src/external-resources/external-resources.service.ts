import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListExternalResourcesQueryDto } from './dto/list-external-resources-query.dto';

const CACHOLA_SOURCE = 'CACHOLA';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

@Injectable()
export class ExternalResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCacholaResources(query: ListExternalResourcesQueryDto) {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const where: Prisma.external_learning_resourceWhereInput = {
      source: CACHOLA_SOURCE,
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
      source: CACHOLA_SOURCE,
      resources: resources.map((resource) => ({
        id: resource.resource_id,
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
