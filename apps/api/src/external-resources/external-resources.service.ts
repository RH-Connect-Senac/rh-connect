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

    // Filtro por categoria (slug): o recurso entra no resultado se possuir
    // ao menos um vínculo cuja categoria tenha esse slug. A categoria é
    // restrita à mesma `source` quando ela é conhecida (informada em
    // `query.source`, ou implícita quando só uma fonte é suportada), para
    // que um slug igual pertencente a outra fonte no futuro não gere
    // correspondência indevida. Isso NÃO limita quais categorias voltam no
    // campo `categories` de cada item — só decide se o recurso é incluído.
    if (query.category) {
      where.category_links = {
        some: {
          category: {
            slug: query.category,
            source: query.source ? query.source : { in: [...SUPPORTED_EXTERNAL_RESOURCE_SOURCES] },
          },
        },
      };
    }

    const resources = await this.prisma.external_learning_resource.findMany({
      where,
      orderBy: [{ area: 'asc' }, { title: 'asc' }],
      take: limit,
      include: {
        // Traz o conjunto COMPLETO de categorias de cada recurso numa única
        // consulta (join), independente de `query.category` ter sido usado
        // para filtrar quais recursos entram. Sem select por recurso à
        // parte — evita N+1.
        category_links: {
          select: {
            category: {
              select: {
                external_code: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
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
        categories: resource.category_links.map((link) => ({
          code: link.category.external_code,
          name: link.category.name,
          slug: link.category.slug,
        })),
      })),
    };
  }
}
