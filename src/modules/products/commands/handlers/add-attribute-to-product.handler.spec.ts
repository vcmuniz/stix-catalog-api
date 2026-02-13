import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { AddAttributeToProductHandler } from './add-attribute-to-product.handler';
import { AddAttributeToProductCommand } from '../impl/add-attribute-to-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain/product.enum';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('AddAttributeToProductHandler', () => {
  let handler: AddAttributeToProductHandler;
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
        AddAttributeToProductHandler,
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

    handler = module.get<AddAttributeToProductHandler>(AddAttributeToProductHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';

    it('should add attribute to DRAFT product', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        attributes: [{ key: 'color', value: 'blue' }],
      });

      const cmd = new AddAttributeToProductCommand(productId, 'color', 'blue');
      const result = await handler.execute(cmd);

      expect(result.attributes).toContainEqual({ key: 'color', value: 'blue' });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should add attribute to ACTIVE product', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ACTIVE,
        attributes: [{ key: 'cpu', value: 'M3' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        attributes: [product.attributes[0], { key: 'ram', value: '16GB' }],
      });

      const cmd = new AddAttributeToProductCommand(productId, 'ram', '16GB');
      const result = await handler.execute(cmd);

      expect(result.attributes).toHaveLength(2);
      expect(result.attributes).toContainEqual({ key: 'ram', value: '16GB' });
    });

    it('should throw when product not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const cmd = new AddAttributeToProductCommand(productId, 'color', 'blue');

      await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
    });

    it('should throw when product is ARCHIVED', async () => {
      const product = {
        id: productId,
        status: ProductStatus.ARCHIVED,
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const cmd = new AddAttributeToProductCommand(productId, 'color', 'blue');

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(cmd)).rejects.toThrow(
        'Archived products cannot have categories or attributes modified',
      );
    });

    it('should throw when attribute key already exists', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [{ key: 'color', value: 'red' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const cmd = new AddAttributeToProductCommand(productId, 'color', 'blue');

      await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(cmd)).rejects.toThrow(
        'Attribute with key "color" already exists',
      );
    });

    it('should support different value types', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      // Test with number
      (repository.save as jest.Mock).mockResolvedValueOnce({
        ...product,
        attributes: [{ key: 'price', value: 99.99 }],
      });

      const cmd = new AddAttributeToProductCommand(productId, 'price', 99.99);
      const result = await handler.execute(cmd);

      expect(result.attributes[0].value).toBe(99.99);

      // Test with boolean - reset mocks
      jest.clearAllMocks();
      (repository.findOne as jest.Mock).mockResolvedValue({
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [],
      });
      (repository.save as jest.Mock).mockResolvedValueOnce({
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [{ key: 'in_stock', value: true }],
      });

      const cmdBool = new AddAttributeToProductCommand(productId, 'in_stock', true);
      const resultBool = await handler.execute(cmdBool);

      expect(resultBool.attributes[0].value).toBe(true);
    });

    it('should be case-sensitive for attribute keys', async () => {
      const product = {
        id: productId,
        status: ProductStatus.DRAFT,
        attributes: [{ key: 'Color', value: 'red' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        attributes: [product.attributes[0], { key: 'color', value: 'blue' }],
      });

      const cmd = new AddAttributeToProductCommand(productId, 'color', 'blue');
      const result = await handler.execute(cmd);

      expect(result.attributes).toHaveLength(2);
      expect(result.attributes).toContainEqual({ key: 'color', value: 'blue' });
    });
  });
});
