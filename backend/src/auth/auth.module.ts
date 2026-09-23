import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './rate-limit.guard';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [JwtModule.registerAsync({
    useFactory: () => ({ secret: process.env.JWT_SECRET }),
  })],
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimitGuard, AuthGuard, PrismaService],
  exports: [AuthService, JwtModule, AuthGuard, PrismaService],
})
export class AuthModule {}
