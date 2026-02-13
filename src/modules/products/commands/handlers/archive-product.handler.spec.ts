import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { ArchiveProductHandler } from './archive-product.handler';
import { ArchiveProductCommand } from '../impl/archive-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain/product.enum';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('ArchiveProductHandler', () => {
  let handler: ArchiveProductHandler;
  let repository: Repository<Product>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockEventPublishingService = {
    publishEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ArchiveProductHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: EventPublishingService,
          useValue: mockEventPublishingService,
        },
      ],
    }).compile();

    handler = module.get<ArchiveProductHandler>(ArchiveProductHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';

    it('should archive ACTIVE product', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }],
        attributes: [{ key: 'color', value: 'blue' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        status: ProductStatus.ARCHIVED,
      });

      const command = new ArchiveProductCommand(productId);
      const result = await handler.execute(command);

      expect(result.status).toBe(ProductStatus.ARCHIVED);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should archive DRAFT product', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.DRAFT,
        categories: [],
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        status: ProductStatus.ARCHIVED,
      });

      const command = new ArchiveProductCommand(productId);
      const result = await handler.execute(command);

      expect(result.status).toBe(ProductStatus.ARCHIVED);
    });

    it('should throw when product does not exist', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const command = new ArchiveProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should not archive already ARCHIVED product (idempotent)', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ARCHIVED,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue(product);

      const command = new ArchiveProductCommand(productId);
      const result = await handler.execute(command);

      expect(result.status).toBe(ProductStatus.ARCHIVED);
    });
  });
});
