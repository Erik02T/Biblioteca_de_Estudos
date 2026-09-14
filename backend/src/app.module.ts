import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreasModule } from './areas/areas.module';
import { AttachmentsModule } from './attachments/attachments.module';

@Module({
  imports: [AreasModule, AttachmentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
