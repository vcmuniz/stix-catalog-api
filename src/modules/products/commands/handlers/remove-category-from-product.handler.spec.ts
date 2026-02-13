import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RemoveCategoryFromProductHandler } from './remove-category-from-product.handler';
import { RemoveCategoryFromProductCommand } from '../impl/remove-category-from-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('RemoveCategoryFromProductHandler', () => {
  let handler: RemoveCategoryFromProductHandler;
  let productRepository: Repository<Product>;
  let eventPublisher: EventPublishingService;
  let module: TestingModule;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        RemoveCategoryFromProductHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventPublishingService,
          useValue: {
            publishEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    handler = module.get<RemoveCategoryFromProductHandler>(RemoveCategoryFromProductHandler);
    productRepository = module.get(getRepositoryToken(Product));
    eventPublisher = module.get(EventPublishingService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should remove category from product and publish event', async () => {
      const command = new RemoveCategoryFromProductCommand('prod-1', 'cat-1');
      const product = {
        id: 'prod-1',
        name: 'Laptop',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }, { id: 'cat-2' }],
        attributes: [{ key: 'color', value: 'silver' }],
      };
      const updatedProduct = {
        ...product,
        categories: [{ id: 'cat-2' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      const result = await handler.execute(command);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        relations: ['categories', 'attributes'],
      });
      expect(productRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        categories: [{ id: 'cat-2' }],
      }));
      expect(eventPublisher.publishEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      const command = new RemoveCategoryFromProductCommand('prod-999', 'cat-1');

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is ARCHIVED', async () => {
      const command = new RemoveCategoryFromProductCommand('prod-1', 'cat-1');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ARCHIVED,
        categories: [{ id: 'cat-1' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Cannot modify archived product');
    });

    it('should throw NotFoundException if category not associated with product', async () => {
      const command = new RemoveCategoryFromProductCommand('prod-1', 'cat-999');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }, { id: 'cat-2' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Category not associated with this product');
    });

    it('should throw BadRequestException if removal would leave ACTIVE product with 0 categories', async () => {
      const command = new RemoveCategoryFromProductCommand('prod-1', 'cat-1');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }],
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('ACTIVE product must have at least 1 category');
    });
  });
});
