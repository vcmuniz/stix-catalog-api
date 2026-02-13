import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { GetCategoryByIdHandler } from './get-category-by-id.handler';
import { GetCategoryByIdQuery } from '../impl/get-category-by-id.query';
import { Category } from '../../entities/category.entity';

describe('GetCategoryByIdHandler', () => {
  let handler: GetCategoryByIdHandler;
  let categoryRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoryByIdHandler,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetCategoryByIdHandler>(GetCategoryByIdHandler);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a category by id', async () => {
    const query = new GetCategoryByIdQuery('123');
    const category = { id: '123', name: 'Electronics', parentId: null, parent: null };

    categoryRepository.findOne.mockResolvedValue(category);

    const result = await handler.execute(query);

    expect(result).toEqual(category);
    expect(categoryRepository.findOne).toHaveBeenCalledWith({
      where: { id: '123' },
      relations: ['parent'],
    });
  });

  it('should throw NotFoundException if category not found', async () => {
    const query = new GetCategoryByIdQuery('non-existent');

    categoryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should return category with parent relation', async () => {
    const query = new GetCategoryByIdQuery('456');
    const parentCategory = { id: '123', name: 'Electronics' };
    const category = { id: '456', name: 'Laptops', parentId: '123', parent: parentCategory };

    categoryRepository.findOne.mockResolvedValue(category);

    const result = await handler.execute(query);

    expect(result.parent).toEqual(parentCategory);
  });
});
