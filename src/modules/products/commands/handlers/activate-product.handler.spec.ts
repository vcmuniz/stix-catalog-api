import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { ActivateProductHandler } from './activate-product.handler';
import { ActivateProductCommand } from '../impl/activate-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain/product.enum';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('ActivateProductHandler', () => {
  let handler: ActivateProductHandler;
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
        ActivateProductHandler,
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

    handler = module.get<ActivateProductHandler>(ActivateProductHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';

    it('should activate product with valid data', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.DRAFT,
        categories: [{ id: 'cat-1', name: 'Electronics' }],
        attributes: [{ key: 'color', value: 'blue' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        status: ProductStatus.ACTIVE,
      });

      const command = new ActivateProductCommand(productId);
      const result = await handler.execute(command);

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(repository.save).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Activating product', {
        productId,
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const command = new ActivateProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Product not found');
    });

    it('should throw when product has no categories', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        categories: [],
        attributes: [{ key: 'color', value: 'blue' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const command = new ActivateProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(
        'Product must have at least 1 category to be activated',
      );
    });

    it('should throw when product has no attributes', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        categories: [{ id: 'cat-1', name: 'Electronics' }],
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const command = new ActivateProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(
        'Product must have at least 1 attribute to be activated',
      );
    });

    it('should throw when product is already ACTIVE', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1', name: 'Electronics' }],
        attributes: [{ key: 'color', value: 'blue' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const command = new ActivateProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(
        'Only DRAFT products can be activated',
      );
    });

    it('should throw when product is ARCHIVED', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ARCHIVED,
        categories: [{ id: 'cat-1', name: 'Electronics' }],
        attributes: [{ key: 'color', value: 'blue' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const command = new ActivateProductCommand(productId);

      await expect(handler.execute(command)).rejects.toThrow(
        'Archived products cannot be reactivated',
      );
    });
  });
});
