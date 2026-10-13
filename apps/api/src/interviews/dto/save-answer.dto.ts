import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

// Corpo de PUT /interviews/:id/questions/:questionId/answer. O limite real
// (1000 caracteres, medido após normalizar quebras de linha) é aplicado no
// service com 400; o teto abaixo só barra corpos absurdos antes disso.
// String vazia/em branco é aceita e LIMPA a resposta.
// `draftVersion` é a versão do rascunho que o cliente conhece (0 = nunca
// salvou) e é OBRIGATÓRIA: a confirmação só vale se a versão ainda for a
// vigente (controle otimista); senão 409 DRAFT_VERSION_CONFLICT.
export class SaveAnswerDto {
  @IsString({ message: 'A resposta deve ser um texto.' })
  @MaxLength(5000, { message: 'A resposta enviada é grande demais.' })
  answer: string;

  @IsInt({ message: 'A versão do rascunho deve ser um número inteiro.' })
  @Min(0, { message: 'A versão do rascunho é inválida.' })
  @Max(2147483646, { message: 'A versão do rascunho é inválida.' })
  draftVersion: number;
}
