import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator';
import { ViewConfigurationsService } from './view-configurations.service';
import {
  CreateViewConfigurationDto,
  UpdateViewConfigurationDto,
} from './dto/view-configuration.dto';

@Controller('view-configurations')
export class ViewConfigurationsController {
  constructor(
    private readonly viewConfigurationsService: ViewConfigurationsService,
  ) {}

  @Post()
  create(@UserId() userId: string, @Body() dto: CreateViewConfigurationDto) {
    return this.viewConfigurationsService.create(userId, dto);
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query('section') section?: string,
    @Query('subSection') subSection?: string,
  ) {
    return this.viewConfigurationsService.findAll(userId, section, subSection);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    const configuration = await this.viewConfigurationsService.findOne(
      userId,
      id,
    );
    if (!configuration)
      throw new NotFoundException('Visualização não encontrada.');
    return configuration;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateViewConfigurationDto,
  ) {
    return this.viewConfigurationsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.viewConfigurationsService.remove(userId, id);
  }
}
