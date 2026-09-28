import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}
