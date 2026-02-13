import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CreateCategoryHandler } from './create-category.handler';
import { CreateCategoryCommand } from '../impl/create-category.command';
import { Category } from '../../entities/category.entity';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('CreateCategoryHandler', () => {
  let handler: CreateCategoryHandler;
  let categoryRepository: any;
  let eventPublisher: any;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    eventPublisher = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCategoryHandler,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: EventPublishingService,
          useValue: eventPublisher,
        },
      ],
    }).compile();

    handler = module.get<CreateCategoryHandler>(CreateCategoryHandler);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a category successfully', async () => {
    const command = new CreateCategoryCommand('Electronics');
    const createdCategory = { id: '123', name: 'Electronics', parentId: null, createdAt: new Date(), updatedAt: new Date() };

    categoryRepository.findOne.mockResolvedValue(null);
    categoryRepository.create.mockReturnValue(createdCategory);
    categoryRepository.save.mockResolvedValue(createdCategory);

    const result = await handler.execute(command);

    expect(result).toEqual(createdCategory);
    expect(categoryRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Electronics' } });
    expect(categoryRepository.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if category name already exists', async () => {
    const command = new CreateCategoryCommand('Electronics');
    const existingCategory = { id: '123', name: 'Electronics' };

    categoryRepository.findOne.mockResolvedValue(existingCategory);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if parent category not found', async () => {
    const command = new CreateCategoryCommand('Laptops', 'parent-id-123');

    categoryRepository.findOne
      .mockResolvedValueOnce(null) // first call: check if name exists
      .mockResolvedValueOnce(null); // second call: check if parent exists

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('should create a category with parent', async () => {
    const command = new CreateCategoryCommand('Laptops', 'parent-id-123');
    const parentCategory = { id: 'parent-id-123', name: 'Electronics' };
    const createdCategory = {
      id: '456',
      name: 'Laptops',
      parentId: 'parent-id-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    categoryRepository.findOne
      .mockResolvedValueOnce(null) // name doesn't exist
      .mockResolvedValueOnce(parentCategory); // parent exists

    categoryRepository.create.mockReturnValue(createdCategory);
    categoryRepository.save.mockResolvedValue(createdCategory);

    const result = await handler.execute(command);

    expect(result).toEqual(createdCategory);
    expect(result.parentId).toBe('parent-id-123');
  });
});
