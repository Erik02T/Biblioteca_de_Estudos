import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { DuplicateAreaDto } from './dto/duplicate-area.dto';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';
import { ReorderAreaDto } from './dto/reorder-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { PurgeAreaDto } from './dto/purge-area.dto';
import {
  ReferenceQueryDto,
  SearchPagesQueryDto,
} from './dto/reference-query.dto';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  create(
    @UserId() userId: string,
    @Body() dto: CreateAreaDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return key === undefined
      ? this.areasService.create(userId, dto)
      : this.areasService.create(userId, dto, key);
  }

  @Get('search')
  search(@UserId() userId: string, @Query() query: SearchPagesQueryDto) {
    return this.areasService.search(userId, query.q, query.page, query.limit);
  }

  @Get('references')
  references(@UserId() userId: string, @Query() query: ReferenceQueryDto) {
    return this.areasService.resolveReferences(userId, query.ids);
  }

  @Get('trash')
  findTrash(@UserId() userId: string, @Query() query: ListAreasQueryDto) {
    return this.areasService.findTrash(userId, query.page, query.limit);
  }

  @Get('navigation')
  navigation(@UserId() userId: string, @Query() query: ListAreasQueryDto) {
    // Tree/parent candidates are independent of collection filters and never expose bodies.
    return this.areasService.listCollection(
      userId,
      { page: query.page, limit: query.limit, orderBy: 'sortOrder' },
      true,
    );
  }

  @Get()
  findAll(@UserId() userId: string, @Query() query: ListAreasQueryDto) {
    return this.areasService.findAll(
      userId,
      query.section,
      query.subSection,
      query.page,
      query.limit,
      query.parentId,
      query.deleted === true,
      query.filters,
      query.orderBy,
      query.orderDirection,
      query,
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

  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: DuplicateAreaDto,
  ) {
    return this.areasService.duplicate(userId, id, dto);
  }

  @Post(':id/reorder')
  reorder(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: ReorderAreaDto,
  ) {
    return this.areasService.reorder(userId, id, dto);
  }

  @Patch(':id/reorder')
  reorderPatch(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: ReorderAreaDto,
  ) {
    return this.areasService.reorder(userId, id, dto);
  }

  @Patch(':id/favorite')
  toggleFavorite(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.toggleFavorite(userId, id);
  }

  @Post(':id/opened')
  markOpened(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.markOpened(userId, id);
  }

  @Patch(':id/trash')
  moveToTrash(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.trash(userId, id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.restore(userId, id);
  }

  @Delete(':id/purge')
  purge(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: PurgeAreaDto,
  ) {
    return this.areasService.purge(userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.areasService.trash(userId, id);
  }
}
