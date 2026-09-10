import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/services/auth.service';
import { AuthController } from './auth/auth.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './auth/services/jwt.strategy';

@Module({
imports: [
ConfigModule.forRoot(),
JwtModule.registerAsync({
useFactory: async (configService: ConfigService) => ({
secret: configService.get<string>('JWT_SECRET'),
signOptions: { expiresIn: '1h' },
}),
inject: [ConfigService],
}),
],
providers: [JwtStrategy],
exports: [JwtModule],
})
export class AppModule {}
