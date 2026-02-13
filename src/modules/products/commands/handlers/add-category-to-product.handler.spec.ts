import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { AddCategoryToProductHandler } from './add-category-to-product.handler';
import { AddCategoryToProductCommand } from '../impl/add-category-to-product.command';
import { Product } from '../../entities/product.entity';
import { Category } from '../../../categories/entities/category.entity';
import { ProductStatus } from '../../domain/product.enum';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('AddCategoryToProductHandler', () => {
  let handler: AddCategoryToProductHandler;
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
        AddCategoryToProductHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
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

    handler = module.get<AddCategoryToProductHandler>(AddCategoryToProductHandler);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';
    const categoryId = '660e8400-e29b-41d4-a716-446655440001';

    it('should add category to DRAFT product', async () => {
      const product = {
        id: productId,
        name: 'Product',
        status: ProductStatus.DRAFT,
        categories: [],
      };
      const category = { id: categoryId, name: 'Electronics' };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (categoryRepository.findOne as jest.Mock).mockResolvedValue(category);
      (productRepository.save as jest.Mock).mockResolvedValue({
        ...product,
        categories: [category],
      });

      const cmd = new AddCategoryToProductCommand(productId, categoryId);
      const result = await handler.execute(cmd);

      expect(result.categories).toContain(category);
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should add category to ACTIVE product', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1', name: 'Tech' }],
      };
      const newCategory = { id: categoryId, name: 'Electronics' };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (categoryRepository.findOne as jest.Mock).mockResolvedValue(newCategory);
      (productRepository.save as jest.Mock).mockResolvedValue({
        ...product,
        categories: [product.categories[0], newCategory],
      });

      const cmd = new AddCategoryToProductCommand(productId, categoryId);
      const result = await handler.execute(cmd);

      expect(result.categories).toHaveLength(2);
    });

    it('should throw when product is ARCHIVED', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ARCHIVED,
        categories: [],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      const cmd = new AddCategoryToProductCommand(productId, categoryId);

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(cmd)).rejects.toThrow(
        'Archived products cannot have categories or attributes modified',
      );
    });

    it('should throw when product not found', async () => {
      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      const cmd = new AddCategoryToProductCommand(productId, categoryId);

      await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
    });

    it('should throw when category not found', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        categories: [],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (categoryRepository.findOne as jest.Mock).mockResolvedValue(null);

      const cmd = new AddCategoryToProductCommand(productId, categoryId);

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(cmd)).rejects.toThrow('Category not found');
    });

    it('should throw when category already associated', async () => {
      const category = { id: categoryId, name: 'Electronics' };
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        categories: [category],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (categoryRepository.findOne as jest.Mock).mockResolvedValue(category);

      const cmd = new AddCategoryToProductCommand(productId, categoryId);

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
    });
  });
});
