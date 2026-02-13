import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetCategoriesHandler } from './get-categories.handler';
import { GetCategoriesQuery } from '../impl/get-categories.query';
import { Category } from '../../entities/category.entity';

describe('GetCategoriesHandler', () => {
  let handler: GetCategoriesHandler;
  let categoryRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoriesHandler,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetCategoriesHandler>(GetCategoriesHandler);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all categories sorted by name', async () => {
    const query = new GetCategoriesQuery();
    const categories = [
      { id: '1', name: 'Electronics', parentId: null },
      { id: '2', name: 'Laptops', parentId: '1' },
      { id: '3', name: 'Smartphones', parentId: '1' },
    ];

    categoryRepository.find.mockResolvedValue(categories);

    const result = await handler.execute(query);

    expect(result).toEqual(categories);
    expect(categoryRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it('should return empty array if no categories exist', async () => {
    const query = new GetCategoriesQuery();

    categoryRepository.find.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(result).toEqual([]);
  });
});
