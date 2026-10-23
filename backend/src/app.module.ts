import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreasModule } from './areas/areas.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AuthRateLimitGuard } from './auth/rate-limit.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';

@Module({
  imports: [AreasModule, AttachmentsModule, AuthModule, StorageModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AuthRateLimitGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
