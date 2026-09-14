import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
})
export class AttachmentsModule {}
