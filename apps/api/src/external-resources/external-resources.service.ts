import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListExternalResourcesQueryDto } from './dto/list-external-resources-query.dto';

/**
 * Fontes de recursos externos atualmente suportadas pelo endpoint único
 * `GET /candidate/materials/external-resources`. Qualquer valor de `source`
 * fora desta lista é ignorado pela consulta, mesmo que já exista (ou venha a
 * existir) na tabela `external_learning_resource` — a exposição pelo
 * endpoint é sempre uma decisão explícita, nunca automática.
 */
const SUPPORTED_SOURCES = ['CACHOLA', 'ORANGO'] as const;

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

@Injectable()
export class ExternalResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listExternalResources(query: ListExternalResourcesQueryDto) {
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const where: Prisma.external_learning_resourceWhereInput = {
      source: { in: [...SUPPORTED_SOURCES] },
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
