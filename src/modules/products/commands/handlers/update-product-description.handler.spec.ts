import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { UpdateProductDescriptionHandler } from './update-product-description.handler';
import { UpdateProductDescriptionCommand } from '../impl/update-product-description.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain/product.enum';

describe('UpdateProductDescriptionHandler', () => {
  let handler: UpdateProductDescriptionHandler;
  let repository: Repository<Product>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        UpdateProductDescriptionHandler,
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
      ],
    }).compile();

    handler = module.get<UpdateProductDescriptionHandler>(UpdateProductDescriptionHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';
    const newDescription = 'Updated product description';

    it('should update description for DRAFT product', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        description: 'Old description',
        status: ProductStatus.DRAFT,
        categories: [],
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        description: newDescription,
      });

      const command = new UpdateProductDescriptionCommand(productId, newDescription);
      const result = await handler.execute(command);

      expect(result.description).toBe(newDescription);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: productId } });
      expect(repository.save).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it('should update description for ACTIVE product', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        description: 'Old description',
        status: ProductStatus.ACTIVE,
        categories: [],
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        description: newDescription,
      });

      const command = new UpdateProductDescriptionCommand(productId, newDescription);
      const result = await handler.execute(command);

      expect(result.description).toBe(newDescription);
    });

    it('should update description for ARCHIVED product (special case)', async () => {
      const product = {
        id: productId,
        name: 'Test Product',
        description: 'Old description',
        status: ProductStatus.ARCHIVED,
        categories: [],
        attributes: [],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        description: newDescription,
      });

      const command = new UpdateProductDescriptionCommand(productId, newDescription);
      const result = await handler.execute(command);

      expect(result.description).toBe(newDescription);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Product description updated successfully',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const command = new UpdateProductDescriptionCommand(productId, newDescription);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Product not found');
    });

    it('should throw BadRequestException when description is empty', async () => {
      const command = new UpdateProductDescriptionCommand(productId, '');

      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.DRAFT,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Description cannot be empty');
    });

    it('should throw BadRequestException when description is only whitespace', async () => {
      const command = new UpdateProductDescriptionCommand(productId, '   ');

      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.DRAFT,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Description cannot be empty');
    });

    it('should trim description before saving', async () => {
      const descriptionWithSpaces = '  Updated description  ';
      const trimmedDescription = 'Updated description';

      const product = {
        id: productId,
        name: 'Test Product',
        status: ProductStatus.DRAFT,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);
      (repository.save as jest.Mock).mockResolvedValue({
        ...product,
        description: trimmedDescription,
      });

      const command = new UpdateProductDescriptionCommand(productId, descriptionWithSpaces);
      const result = await handler.execute(command);

      expect(result.description).toBe(trimmedDescription);
      const saveCall = (repository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.description).toBe(trimmedDescription);
    });
  });
});
