import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { ViewConfigurationsController } from './view-configurations.controller';
import { ViewConfigurationsService } from './view-configurations.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { RevisionsService } from './revisions.service';
import { ExportsService } from './exports.service';
import {
  ExportsController,
  RevisionsController,
} from './portability.controller';

@Module({
  imports: [StorageModule],
  controllers: [
    RevisionsController,
    ExportsController,
    AreasController,
    ViewConfigurationsController,
    TemplatesController,
  ],
  providers: [
    RevisionsService,
    ExportsService,
    AreasService,
    ViewConfigurationsService,
    TemplatesService,
    PrismaService,
  ],
})
export class AreasModule {}
