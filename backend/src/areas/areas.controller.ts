import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  create(@UserId() userId: string, @Body() dto: CreateAreaDto) {
    return this.areasService.create(userId, dto);
  }

  @Get()
  findAll(@UserId() userId: string, @Query() query: ListAreasQueryDto) {
    return this.areasService.findAll(
      userId,
      query.section,
      query.subSection,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.remove(userId, id);
  }
}
