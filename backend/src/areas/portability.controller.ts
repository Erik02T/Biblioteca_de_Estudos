import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator';
import {
  CreateRevisionDto,
  ExportDto,
  RevisionTokenDto,
} from './dto/portability.dto';
import { ExportsService } from './exports.service';
import { RevisionsService } from './revisions.service';

@Controller('areas/:id/revisions')
export class RevisionsController {
  constructor(private readonly revisions: RevisionsService) {}
  @Get()
  list(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.revisions.list(userId, id);
  }
  @Post()
  create(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRevisionDto,
  ) {
    return this.revisions.create(userId, id, dto);
  }
  @Get(':revisionId')
  preview(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ) {
    return this.revisions.preview(userId, id, revisionId);
  }
  @Post(':revisionId/restore')
  restore(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body() dto: RevisionTokenDto,
  ) {
    return this.revisions.restore(userId, id, revisionId, dto);
  }
}

@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}
  @Post()
  async create(@UserId() userId: string, @Body() dto: ExportDto) {
    return new StreamableFile(await this.exports.create(userId, dto), {
      type: 'application/zip',
      disposition: 'attachment; filename="biblioteca-estudos.zip"',
    });
  }
}
