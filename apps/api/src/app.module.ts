import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

@Module({
imports: [
ConfigModule.forRoot({ isGlobal: true }),
PrismaModule,
AuthModule,
],
controllers: [AppController],
})
export class AppModule {}