import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  imports: [StorageModule],
  controllers: [AreasController],
  providers: [AreasService, PrismaService],
})
export class AreasModule {}
