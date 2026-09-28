import { IsIn } from 'class-validator';
import { SUPPORTED_EXTERNAL_RESOURCE_SOURCES } from './list-external-resources-query.dto';
import type { ExternalResourceSource } from './list-external-resources-query.dto';

/**
 * Query do endpoint `GET /candidate/materials/external-resources/categories`.
 *
 * Reaproveita a mesma lista de fontes suportadas e a mesma validação
 * (`@IsIn`) já usadas pelo DTO de listagem de recursos
 * (`ListExternalResourcesQueryDto`), para que as duas rotas nunca aceitem um
 * conjunto de fontes divergente — uma única constante
 * (`SUPPORTED_EXTERNAL_RESOURCE_SOURCES`) continua sendo a fonte de verdade
 * de quais `source` existem.
 *
 * Diferente do DTO de recursos, `source` é OBRIGATÓRIO aqui: o contrato de
 * resposta desta rota é uma lista plana de `{ code, name, slug }` sem o
 * campo `source` por item, então não haveria como o cliente distinguir a
 * origem das categorias se múltiplas fontes fossem combinadas numa única
 * chamada sem `source`. Omitir `source` (ou enviar um valor fora de
 * `SUPPORTED_EXTERNAL_RESOURCE_SOURCES`) resulta em 400, pelo mesmo
 * mecanismo de validação (`ValidationPipe` + `class-validator`) já usado no
 * restante do módulo.
 */
export class ListExternalResourceCategoriesQueryDto {
  @IsIn(SUPPORTED_EXTERNAL_RESOURCE_SOURCES)
  source!: ExternalResourceSource;
}
