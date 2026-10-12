import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

// Corpo de PUT /interviews/:id/questions/:questionId/answer/draft.
// `version` é a versão do rascunho que o cliente conhece (0 = nunca salvou).
// O limite real (1000 caracteres, após normalizar quebras de linha) é aplicado
// no service com 400; o teto abaixo só barra corpos absurdos. Texto vazio/em
// branco LIMPA o rascunho (nunca toca na resposta oficial).
export class SaveDraftDto {
  @IsString({ message: 'O rascunho deve ser um texto.' })
  @MaxLength(5000, { message: 'O rascunho enviado é grande demais.' })
  draft: string;

  @IsInt({ message: 'A versão do rascunho deve ser um número inteiro.' })
  @Min(0, { message: 'A versão do rascunho é inválida.' })
  @Max(2147483646, { message: 'A versão do rascunho é inválida.' })
  version: number;
}
