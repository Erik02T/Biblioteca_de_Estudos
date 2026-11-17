import { Test, TestingModule } from '@nestjs/testing';
import { SectionType, SubSectionType } from '@prisma/client';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { DuplicateAreaDto } from './dto/duplicate-area.dto';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';
import { ReorderAreaDto } from './dto/reorder-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

describe('AreasController', () => {
  let controller: AreasController;
  let service: AreasService;

  const mockAreasService = {
    create: jest.fn(),
    search: jest.fn(),
    findTrash: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    duplicate: jest.fn(),
    reorder: jest.fn(),
    toggleFavorite: jest.fn(),
    trash: jest.fn(),
    restore: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
      ],
    }).compile();

    controller = module.get<AreasController>(AreasController);
    service = module.get<AreasService>(AreasService);
    jest.clearAllMocks();
  });

  it('delegates create to areasService.create', async () => {
    const dto = new CreateAreaDto();
    dto.nome = 'Nova Área';
    mockAreasService.create.mockResolvedValue({ id: 'area-1', ...dto });

    const result = await controller.create('user-1', dto);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ id: 'area-1', ...dto });
  });

  it('delegates search to areasService.search', async () => {
    mockAreasService.search.mockResolvedValue({ items: [], pagination: {} });

    await controller.search('user-1', { q: 'termo', page: 1, limit: 20 });
    expect(service.search).toHaveBeenCalledWith('user-1', 'termo', 1, 20);
  });

  it('delegates findTrash to areasService.findTrash', async () => {
    mockAreasService.findTrash.mockResolvedValue({ items: [], pagination: {} });
    const query: ListAreasQueryDto = { page: 2, limit: 10 };

    await controller.findTrash('user-1', query);
    expect(service.findTrash).toHaveBeenCalledWith('user-1', 2, 10);
  });

  it('delegates findAll with query parameters to areasService.findAll', async () => {
    mockAreasService.findAll.mockResolvedValue({ items: [], pagination: {} });
    const query: ListAreasQueryDto = {
      section: SectionType.LINGUAGENS,
      subSection: SubSectionType.ESTUDANDO,
      page: 1,
      limit: 20,
      parentId: 'p-1',
      deleted: false,
    };

    await controller.findAll('user-1', query);
    expect(service.findAll).toHaveBeenCalledWith(
      'user-1',
      SectionType.LINGUAGENS,
      SubSectionType.ESTUDANDO,
      1,
      20,
      'p-1',
      false,
      undefined,
      undefined,
      undefined,
      query,
    );
  });

  it('delegates findOne to areasService.findOne', async () => {
    mockAreasService.findOne.mockResolvedValue({ id: 'area-1' });

    const result = await controller.findOne('area-1', 'user-1');
    expect(service.findOne).toHaveBeenCalledWith('user-1', 'area-1');
    expect(result).toEqual({ id: 'area-1' });
  });

  it('delegates update to areasService.update', async () => {
    const dto: UpdateAreaDto = {
      nome: 'Atualizada',
      updatedAt: '2026-11-10T12:00:00.000Z',
    };
    mockAreasService.update.mockResolvedValue({ id: 'area-1', ...dto });

    const result = await controller.update('area-1', 'user-1', dto);
    expect(service.update).toHaveBeenCalledWith('user-1', 'area-1', dto);
    expect(result).toEqual({ id: 'area-1', ...dto });
  });

  it('delegates duplicate to areasService.duplicate', async () => {
    const dto: DuplicateAreaDto = { includeChildren: true };
    mockAreasService.duplicate.mockResolvedValue({ id: 'area-copy' });

    const result = await controller.duplicate('area-1', 'user-1', dto);
    expect(service.duplicate).toHaveBeenCalledWith('user-1', 'area-1', dto);
    expect(result).toEqual({ id: 'area-copy' });
  });

  it('delegates reorder (POST) to areasService.reorder', async () => {
    const dto: ReorderAreaDto = { beforeId: 'area-2' };
    mockAreasService.reorder.mockResolvedValue({ id: 'area-1', sortOrder: 0 });

    const result = await controller.reorder('area-1', 'user-1', dto);
    expect(service.reorder).toHaveBeenCalledWith('user-1', 'area-1', dto);
    expect(result).toEqual({ id: 'area-1', sortOrder: 0 });
  });

  it('delegates reorderPatch (PATCH) to areasService.reorder', async () => {
    const dto: ReorderAreaDto = { afterId: 'area-2' };
    mockAreasService.reorder.mockResolvedValue({ id: 'area-1', sortOrder: 1 });

    const result = await controller.reorderPatch('area-1', 'user-1', dto);
    expect(service.reorder).toHaveBeenCalledWith('user-1', 'area-1', dto);
    expect(result).toEqual({ id: 'area-1', sortOrder: 1 });
  });

  it('delegates toggleFavorite to areasService.toggleFavorite', async () => {
    mockAreasService.toggleFavorite.mockResolvedValue({
      id: 'area-1',
      isFavorite: true,
    });

    const result = await controller.toggleFavorite('area-1', 'user-1');
    expect(service.toggleFavorite).toHaveBeenCalledWith('user-1', 'area-1');
    expect(result).toEqual({ id: 'area-1', isFavorite: true });
  });

  it('delegates moveToTrash and remove to areasService.trash', async () => {
    mockAreasService.trash.mockResolvedValue({
      id: 'area-1',
      deletedAt: new Date(),
    });

    await controller.moveToTrash('area-1', 'user-1');
    expect(service.trash).toHaveBeenCalledWith('user-1', 'area-1');

    await controller.remove('area-1', 'user-1');
    expect(service.trash).toHaveBeenCalledWith('user-1', 'area-1');
  });

  it('delegates restore to areasService.restore', async () => {
    mockAreasService.restore.mockResolvedValue({
      id: 'area-1',
      deletedAt: null,
    });

    const result = await controller.restore('area-1', 'user-1');
    expect(service.restore).toHaveBeenCalledWith('user-1', 'area-1');
    expect(result).toEqual({ id: 'area-1', deletedAt: null });
  });
});
