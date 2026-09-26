import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { assertJwtSecretConfigured } from './config/assert-jwt-secret';
import { resolveFrontendUrl } from './config/resolve-frontend-url';
import { shouldEnableSwagger } from './config/should-enable-swagger';

async function bootstrap() {
  // Prompt 13 (M4): fail-fast — a API não deve iniciar silenciosamente com
  // JWT_SECRET ausente/vazio (tokens seriam assinados/verificados com
  // `undefined`). Não gera segredo automaticamente, não usa fallback, e não
  // loga o valor da variável — apenas informa que ela é obrigatória.
  try {
    assertJwtSecretConfigured();
  } catch {
    console.error(
      'Erro fatal: a variável de ambiente JWT_SECRET é obrigatória e não pode estar vazia.',
    );
    process.exit(1);
  }

  // QA de segurança (Bloco 6): mesmo padrão de fail-fast do JWT_SECRET —
  // em produção, FRONTEND_URL precisa existir explicitamente, para nunca
  // subir apontando o CORS silenciosamente para localhost. Fora de
  // produção, mantém o fallback de desenvolvimento. Nunca loga o valor da
  // variável.
  let frontendUrl: string;
  try {
    frontendUrl = resolveFrontendUrl();
  } catch {
    console.error(
      'Erro fatal: a variável de ambiente FRONTEND_URL é obrigatória em produção (NODE_ENV=production) e não pode estar vazia.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // QA de segurança (Bloco 6): Helmet aplica, com a configuração padrão do
  // pacote (sem customizar diretivas individuais nem desabilitar nenhuma
  // proteção), o conjunto de headers HTTP de segurança recomendados
  // (X-Content-Type-Options, X-DNS-Prefetch-Control,
  // Strict-Transport-Security quando HTTPS, etc.).
  app.use(helmet());

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // QA de segurança (Bloco 6): Swagger deixou de ser montado
  // incondicionalmente — só é habilitado quando ENABLE_SWAGGER=true é
  // definido explicitamente (nunca com base só em NODE_ENV, sem fallback
  // que exponha a documentação por acidente). Na VPS de apresentação a
  // equipe pode definir "true" se quiser; em produção real pode continuar
  // "false" (ou ausente).
  if (shouldEnableSwagger()) {
    const config = new DocumentBuilder()
      .setTitle('RH Connect API')
      .setDescription('API de autenticação e gerenciamento do RH Connect')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
