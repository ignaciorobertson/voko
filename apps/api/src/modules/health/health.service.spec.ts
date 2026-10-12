import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { DataSource } from 'typeorm';

describe('HealthService', () => {
  let service: HealthService;
  let mockDataSource: {
    isInitialized: boolean;
    initialize: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      initialize: jest.fn().mockResolvedValue(true),
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe retornar status "ok" cuando PostgreSQL responde a SELECT 1', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('up');
    expect(result.database.type).toBe('PostgreSQL');
  });

  it('debe retornar status "degraded" cuando no se puede conectar a PostgreSQL', async () => {
    mockDataSource.isInitialized = false;
    mockDataSource.initialize.mockRejectedValueOnce(new Error('Connection timeout'));

    const result = await service.check();
    expect(result.status).toBe('degraded');
    expect(result.database.status).toBe('down');
    expect(result.database.details).toContain('Connection timeout');
  });
});
