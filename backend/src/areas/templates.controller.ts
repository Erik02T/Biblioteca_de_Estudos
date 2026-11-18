import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator';
import { TemplatesService } from './templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ApplyTemplateDto,
  TemplateFromPageDto,
} from './dto/template.dto';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@UserId() userId: string, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(userId, dto);
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query('type') type?: string,
    @Query('section') section?: string,
    @Query('subSection') subSection?: string,
  ) {
    return this.templatesService.findAll(userId, type, section, subSection);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.templatesService.findOne(userId, id);
  }

  @Post('from-page')
  fromPage(@UserId() userId: string, @Body() dto: TemplateFromPageDto) {
    return this.templatesService.fromPage(userId, dto);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @UserId() userId: string) {
    return this.templatesService.preview(userId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.templatesService.remove(userId, id);
  }

  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: ApplyTemplateDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.templatesService.apply(userId, id, dto, key);
  }
}
