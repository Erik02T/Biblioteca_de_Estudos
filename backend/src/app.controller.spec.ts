import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: () => 'Hello World!',
            getHealth: jest.fn().mockReturnValue({
              status: 'ok',
              timestamp: '2026-01-01T00:00:00.000Z',
            }),
            getReadiness: jest.fn().mockResolvedValue({
              status: 'ok',
              timestamp: '2026-01-01T00:00:00.000Z',
              checks: { database: 'connected' },
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return status ok', () => {
      const result = appController.health();
      expect(result).toEqual({
        status: 'ok',
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      expect(appService.getHealth).toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('should return status ok when database is connected', async () => {
      const result = await appController.ready();
      expect(result).toEqual({
        status: 'ok',
        timestamp: '2026-01-01T00:00:00.000Z',
        checks: { database: 'connected' },
      });

      expect(appService.getReadiness).toHaveBeenCalled();
    });
  });
});
