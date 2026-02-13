import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CqrsModule } from '@nestjs/cqrs';
import { GetProductsHandler } from './get-products.handler';
import { GetProductByIdHandler } from './get-product-by-id.handler';
import { GetProductsQuery } from '../impl/get-products.query';
import { GetProductByIdQuery } from '../impl/get-product-by-id.query';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain/product.enum';

describe('GetProductsHandler', () => {
  let handler: GetProductsHandler;
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
        GetProductsHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    handler = module.get<GetProductsHandler>(GetProductsHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all products', async () => {
      const products = [
        {
          id: 'prod-1',
          name: 'Product 1',
          status: ProductStatus.ACTIVE,
        },
        {
          id: 'prod-2',
          name: 'Product 2',
          status: ProductStatus.DRAFT,
        },
      ];

      (repository.find as jest.Mock).mockResolvedValue(products);

      const query = new GetProductsQuery();
      const result = await handler.execute(query);

      expect(result).toEqual(products);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no products', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const query = new GetProductsQuery();
      const result = await handler.execute(query);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should include all product statuses', async () => {
      const products = [
        { id: '1', status: ProductStatus.DRAFT },
        { id: '2', status: ProductStatus.ACTIVE },
        { id: '3', status: ProductStatus.ARCHIVED },
      ];

      (repository.find as jest.Mock).mockResolvedValue(products);

      const query = new GetProductsQuery();
      const result = await handler.execute(query);

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.status)).toContain(ProductStatus.DRAFT);
      expect(result.map((p) => p.status)).toContain(ProductStatus.ACTIVE);
      expect(result.map((p) => p.status)).toContain(ProductStatus.ARCHIVED);
    });
  });
});

describe('GetProductByIdHandler', () => {
  let handler: GetProductByIdHandler;
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
        GetProductByIdHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    handler = module.get<GetProductByIdHandler>(GetProductByIdHandler);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const productId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return product by id', async () => {
      const product = {
        id: productId,
        name: 'MacBook Pro',
        status: ProductStatus.ACTIVE,
        categories: [{ id: 'cat-1', name: 'Electronics' }],
        attributes: [{ key: 'cpu', value: 'M3' }],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const query = new GetProductByIdQuery(productId);
      const result = await handler.execute(query);

      expect(result).toEqual(product);
      expect(result.id).toBe(productId);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const query = new GetProductByIdQuery(productId);

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Product not found');
    });

    it('should include categories and attributes', async () => {
      const product = {
        id: productId,
        name: 'Product',
        categories: [
          { id: 'cat-1', name: 'Electronics' },
          { id: 'cat-2', name: 'Computers' },
        ],
        attributes: [
          { key: 'cpu', value: 'M3' },
          { key: 'ram', value: '16GB' },
        ],
      };

      (repository.findOne as jest.Mock).mockResolvedValue(product);

      const query = new GetProductByIdQuery(productId);
      const result = await handler.execute(query);

      expect(result.categories).toHaveLength(2);
      expect(result.attributes).toHaveLength(2);
    });
  });
});
