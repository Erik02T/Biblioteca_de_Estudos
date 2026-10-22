import { Controller, Get } from '@nestjs/common';
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
  async health() {
    return this.appService.getHealth();
  }

  @Get('health/ready')
  @Public()
  async ready() {
    return this.appService.getReadiness();
  }
}
