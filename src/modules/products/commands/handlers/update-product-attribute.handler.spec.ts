import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateProductAttributeHandler } from './update-product-attribute.handler';
import { UpdateProductAttributeCommand } from '../impl/update-product-attribute.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('UpdateProductAttributeHandler', () => {
  let handler: UpdateProductAttributeHandler;
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
        UpdateProductAttributeHandler,
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

    handler = module.get<UpdateProductAttributeHandler>(UpdateProductAttributeHandler);
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
    it('should update attribute and publish event', async () => {
      const command = new UpdateProductAttributeCommand('prod-1', 'color', 'blue');
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
        attributes: [
          { key: 'color', value: 'blue' },
          { key: 'size', value: 'large' },
        ],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      const result = await handler.execute(command);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        relations: ['categories'],
      });
      expect(productRepository.save).toHaveBeenCalled();
      expect(eventPublisher.publishEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      const command = new UpdateProductAttributeCommand('prod-999', 'color', 'blue');

      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is ARCHIVED', async () => {
      const command = new UpdateProductAttributeCommand('prod-1', 'color', 'blue');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ARCHIVED,
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Cannot modify archived product');
    });

    it('should throw NotFoundException if attribute not found', async () => {
      const command = new UpdateProductAttributeCommand('prod-1', 'nonexistent', 'value');
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        attributes: [{ key: 'color', value: 'silver' }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow('Attribute not associated with this product');
    });

    it('should handle numeric attribute values', async () => {
      const command = new UpdateProductAttributeCommand('prod-1', 'price', 199.99);
      const product = {
        id: 'prod-1',
        status: ProductStatus.DRAFT,
        attributes: [{ key: 'price', value: 99.99 }],
      };
      const updatedProduct = {
        ...product,
        attributes: [{ key: 'price', value: 199.99 }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      await handler.execute(command);

      expect(eventPublisher.publishEvent).toHaveBeenCalled();
    });

    it('should handle boolean attribute values', async () => {
      const command = new UpdateProductAttributeCommand('prod-1', 'available', true);
      const product = {
        id: 'prod-1',
        status: ProductStatus.ACTIVE,
        attributes: [{ key: 'available', value: false }],
      };
      const updatedProduct = {
        ...product,
        attributes: [{ key: 'available', value: true }],
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      await handler.execute(command);

      expect(eventPublisher.publishEvent).toHaveBeenCalled();
    });
  });
});
