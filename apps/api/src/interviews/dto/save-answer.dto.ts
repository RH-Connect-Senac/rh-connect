import { IsString, MaxLength } from 'class-validator';

// Corpo de PUT /interviews/:id/questions/:questionId/answer. O limite real
// (1000 caracteres, medido após normalizar quebras de linha) é aplicado no
// service com 400; o teto abaixo só barra corpos absurdos antes disso.
// String vazia/em branco é aceita e LIMPA a resposta.
export class SaveAnswerDto {
  @IsString({ message: 'A resposta deve ser um texto.' })
  @MaxLength(5000, { message: 'A resposta enviada é grande demais.' })
  answer: string;
}
