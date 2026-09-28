import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Fontes de recursos externos atualmente suportadas pelo endpoint
 * `GET /candidate/materials/external-resources`. Exportada aqui (e não
 * duplicada no service) para que a validação do query param `source` e o
 * filtro usado na consulta Prisma nunca fiquem dessincronizados.
 */
export const SUPPORTED_EXTERNAL_RESOURCE_SOURCES = ['CACHOLA', 'ORANGO'] as const;

export type ExternalResourceSource = (typeof SUPPORTED_EXTERNAL_RESOURCE_SOURCES)[number];

export class ListExternalResourcesQueryDto {
  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(SUPPORTED_EXTERNAL_RESOURCE_SOURCES)
  source?: ExternalResourceSource;

  /**
   * Slug da categoria (ex.: "marketing", "inteligencia-artificial"), não o
   * código numérico interno. Opcional; sem correspondência retorna lista
   * vazia, nunca erro. Limite alinhado à coluna `external_resource_category.slug`
   * (VarChar(150)).
   */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;

  /**
   * Deslocamento (em número de registros) para paginação real no backend.
   * Opcional; default 0 (primeira página) quando ausente. Inteiro e não
   * negativo — não há limite superior aqui porque `offset` sozinho não
   * amplia o volume de dados retornado por requisição (quem faz isso é
   * `limit`, já limitado a `MAX_LIMIT`); um offset além do total apenas
   * resulta em `resources: []`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
