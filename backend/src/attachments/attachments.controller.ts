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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserId } from '../common/user-id.decorator';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import {
  getContentDisposition,
  validateFileHeaderAndExtension,
} from './utils/file-validation.util';

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
        try {
          validateFileHeaderAndExtension(file.mimetype, file.originalname);
          callback(null, true);
        } catch (error) {
          callback(
            error instanceof Error
              ? error
              : new BadRequestException('Arquivo inválido'),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('areaId') areaId: string,
    @Res({ passthrough: true })
    res?: { setHeader(name: string, value: string): void },
  ) {
    if (!file) throw new BadRequestException('O campo file é obrigatório');
    const result = await this.attachmentsService.upload(userId, areaId, file);
    if (res && file.mimetype) {
      res.setHeader(
        'Content-Disposition',
        getContentDisposition(file.mimetype, file.originalname),
      );
    }
    return result;
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
