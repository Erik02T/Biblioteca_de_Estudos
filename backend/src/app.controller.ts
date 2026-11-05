import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  health() {
    return this.appService.getHealth();
  }

  @Get('health/ready')
  @Public()
  async ready(@Res({ passthrough: true }) response?: Response) {
    const readiness = await this.appService.getReadiness();
    if (readiness.status !== 'ok' && response) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return readiness;
  }
}
