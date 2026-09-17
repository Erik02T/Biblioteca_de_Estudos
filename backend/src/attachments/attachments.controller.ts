import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserId, UserIdGuard } from '../common/user-id.decorator';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@UseGuards(UserIdGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  create(@UserId() userId: string, @Body() dto: CreateAttachmentDto) {
    return this.attachmentsService.create(userId, dto);
  }

  @Get()
  list(@UserId() userId: string, @Query('areaId') areaId: string) {
    if (!areaId) throw new BadRequestException('areaId é obrigatório');
    return this.attachmentsService.list(userId, areaId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype) {
          callback(
            new BadRequestException('O arquivo precisa informar o tipo MIME'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @UserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('areaId') areaId: string,
  ) {
    if (!file) throw new BadRequestException('O campo file é obrigatório');
    return this.attachmentsService.upload(userId, areaId, file);
  }

  @Get(':id')
  findOne(@UserId() userId: string, @Param('id') id: string) {
    return this.attachmentsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttachmentDto,
  ) {
    return this.attachmentsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.attachmentsService.remove(userId, id);
  }
}
