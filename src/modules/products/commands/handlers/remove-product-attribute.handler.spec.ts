import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RemoveProductAttributeHandler } from './remove-product-attribute.handler';
import { RemoveProductAttributeCommand } from '../impl/remove-product-attribute.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('RemoveProductAttributeHandler', () => {
  let handler: RemoveProductAttributeHandler;
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
        RemoveProductAttributeHandler,
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

    handler = module.get<RemoveProductAttributeHandler>(RemoveProductAttributeHandler);
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
    it('should remove attribute from product and publish event', async () => {
      const command = new RemoveProductAttributeCommand('prod-1', 'color');
      const product = {
        id: 'prod-1',
        name: 'Laptop',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }],
        attributes: [
          { key: 'color', value: 'silver' },
          { key: 'size', value: 'large' },
        ],
      };
      const updatedProduct = {
        ...product,
        attributes: [{ key: 'size', value: 'large' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      const result = await handler.execute(command);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        relations: ['categories'],
      });
      expect(productRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        attributes: [{ key: 'size', value: 'large' }],
      }));
      expect(eventPublisher.publishEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      const command = new RemoveProductAttributeCommand('prod-999', 'color');

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is ARCHIVED', async () => {
      const command = new RemoveProductAttributeCommand('prod-1', 'color');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ARCHIVED,
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Cannot modify archived product');
    });

    it('should throw NotFoundException if attribute not associated with product', async () => {
      const command = new RemoveProductAttributeCommand('prod-1', 'nonexistent');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Attribute not associated with this product');
    });

    it('should throw BadRequestException if removal would leave ACTIVE product with 0 attributes', async () => {
      const command = new RemoveProductAttributeCommand('prod-1', 'color');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1' }],
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('ACTIVE product must have at least 1 attribute');
    });
  });
});
