import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { UpdateCategoryHandler } from './update-category.handler';
import { UpdateCategoryCommand } from '../impl/update-category.command';
import { Category } from '../../entities/category.entity';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

describe('UpdateCategoryHandler', () => {
  let handler: UpdateCategoryHandler;
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
        UpdateCategoryHandler,
        {
          provide: getRepositoryToken(Category),
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
          useValue: eventPublisher,
        },
      ],
    }).compile();

    handler = module.get<UpdateCategoryHandler>(UpdateCategoryHandler);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update a category successfully', async () => {
    const command = new UpdateCategoryCommand('123', 'Electronics & Gadgets');
    const existingCategory = { id: '123', name: 'Electronics', parentId: null };
    const updatedCategory = { ...existingCategory, name: 'Electronics & Gadgets' };

    categoryRepository.findOne
      .mockResolvedValueOnce(existingCategory) // find category
      .mockResolvedValueOnce(null); // check if new name exists

    categoryRepository.save.mockResolvedValue(updatedCategory);

    const result = await handler.execute(command);

    expect(result.name).toBe('Electronics & Gadgets');
    expect(categoryRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if category not found', async () => {
    const command = new UpdateCategoryCommand('non-existent-id', 'NewName');

    categoryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if new name already exists', async () => {
    const command = new UpdateCategoryCommand('123', 'ExistingName');
    const existingCategory = { id: '123', name: 'Electronics' };
    const anotherCategory = { id: '456', name: 'ExistingName' };

    categoryRepository.findOne
      .mockResolvedValueOnce(existingCategory) // find category to update
      .mockResolvedValueOnce(anotherCategory); // check if new name exists

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('should not update if name is the same', async () => {
    const command = new UpdateCategoryCommand('123', 'Electronics');
    const existingCategory = { id: '123', name: 'Electronics', parentId: null };

    categoryRepository.findOne.mockResolvedValue(existingCategory);
    categoryRepository.save.mockResolvedValue(existingCategory);

    await handler.execute(command);

    expect(categoryRepository.save).toHaveBeenCalledWith(existingCategory);
  });
});
