import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateProductHandler } from './create-product.handler';
import { CreateProductCommand } from '../impl/create-product.command';
import { Product } from '../../entities/product.entity';
import { Category } from '../../../categories/entities/category.entity';
import { ProductStatus } from '../../domain/product.enum';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;

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
        CreateProductHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findByIds: jest.fn(),
            find: jest.fn(),
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

    handler = module.get<CreateProductHandler>(CreateProductHandler);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const categoryId = '550e8400-e29b-41d4-a716-446655440000';
    const category = { id: categoryId, name: 'Electronics' };

    it('should create product with valid data', async () => {
      const cmd = new CreateProductCommand(
        'MacBook Pro',
        'High performance laptop',
        [categoryId],
        [{ key: 'cpu', value: 'M3 Pro' }],
      );

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.find as jest.Mock).mockResolvedValue([category]);
      (productRepository.create as jest.Mock).mockReturnValue({
        name: 'MacBook Pro',
        description: 'High performance laptop',
        status: ProductStatus.DRAFT,
        attributes: [{ key: 'cpu', value: 'M3 Pro' }],
      });
      (productRepository.save as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        name: 'MacBook Pro',
        status: ProductStatus.DRAFT,
      });

      const result = await handler.execute(cmd);

      expect(result.name).toBe('MacBook Pro');
      expect(result.status).toBe(ProductStatus.DRAFT);
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate name', async () => {
      const cmd = new CreateProductCommand(
        'MacBook Pro',
        'High performance laptop',
        [categoryId],
        [{ key: 'cpu', value: 'M3 Pro' }],
      );

      (productRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        name: 'MacBook Pro',
      });

      await expect(handler.execute(cmd)).rejects.toThrow(ConflictException);
      await expect(handler.execute(cmd)).rejects.toThrow('Product with this name already exists');
    });

    it('should throw BadRequestException when category not found', async () => {
      const cmd = new CreateProductCommand(
        'MacBook Pro',
        'Laptop',
        ['nonexistent-cat'],
        [{ key: 'cpu', value: 'M3 Pro' }],
      );

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.find as jest.Mock).mockResolvedValue([]); // Returns empty!

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(cmd)).rejects.toThrow('One or more categories not found');
    });

    it('should validate duplicate attribute keys', async () => {
      const cmd = new CreateProductCommand(
        'Laptop',
        'A laptop',
        [categoryId],
        [
          { key: 'cpu', value: 'M3' },
          { key: 'cpu', value: 'Intel' }, // Duplicate key!
        ],
      );

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.find as jest.Mock).mockResolvedValue([category]);

      await expect(handler.execute(cmd)).rejects.toThrow('Duplicate attribute key');
    });

    it('should set status to DRAFT on creation', async () => {
      const cmd = new CreateProductCommand(
        'New Product',
        'Description',
        [categoryId],
        [{ key: 'key1', value: 'value1' }],
      );

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.find as jest.Mock).mockResolvedValue([category]);
      const createdProduct = {
        name: 'New Product',
        status: ProductStatus.DRAFT,
      };
      (productRepository.create as jest.Mock).mockReturnValue(createdProduct);
      (productRepository.save as jest.Mock).mockResolvedValue({
        ...createdProduct,
        id: 'prod-1',
      });

      const result = await handler.execute(cmd);

      expect(result.status).toBe(ProductStatus.DRAFT);
    });
  });
});
