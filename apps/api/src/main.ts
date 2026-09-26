import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { assertJwtSecretConfigured } from './config/assert-jwt-secret';

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

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('RH Connect API')
    .setDescription('API de autenticação e gerenciamento do RH Connect')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
