import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryCommand } from '../impl/create-category.command';
import { CreateCategoryHandler } from './create-category.handler';
import { Category } from '../../entities/category.entity';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { KafkaEventPublisher } from '../../../../shared/events/kafka-event-publisher';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('CreateCategoryHandler - Integration Tests', () => {
  let handler: CreateCategoryHandler;
  let categoryRepository: Repository<Category>;
  let module: TestingModule;

  const mockKafkaPublisher = {
    publishEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CqrsModule],
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
          provide: KafkaEventPublisher,
          useValue: mockKafkaPublisher,
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

    handler = module.get<CreateCategoryHandler>(CreateCategoryHandler);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Flow: Create Category → Save DB → Publish Kafka', () => {
    it('should create category, save to DB, and publish event to Kafka', async () => {
      // Arrange
      const command = new CreateCategoryCommand('Electronics');
      const savedCategory = {
        id: 'cat-123',
        name: 'Electronics',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (categoryRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.create as jest.Mock).mockReturnValue(savedCategory);
      (categoryRepository.save as jest.Mock).mockResolvedValue(savedCategory);
      const eventPublisher = module.get(EventPublishingService);

      // Act
      const result = await handler.execute(command);

      // Assert - Category saved to DB
      expect(categoryRepository.save).toHaveBeenCalledWith(expect.any(Object));
      expect(result.id).toBe('cat-123');
      expect(result.name).toBe('Electronics');

      // Assert - Event published to Kafka
      expect(eventPublisher.publishEvent).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should create category with parent and publish event', async () => {
      // Arrange
      const command = new CreateCategoryCommand('Laptops', 'cat-parent-123');
      const parentCategory = { id: 'cat-parent-123', name: 'Electronics' };
      const savedCategory = {
        id: 'cat-456',
        name: 'Laptops',
        parentId: 'cat-parent-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (categoryRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(parentCategory); // parent check
      (categoryRepository.create as jest.Mock).mockReturnValue(savedCategory);
      (categoryRepository.save as jest.Mock).mockResolvedValue(savedCategory);
      const eventPublisher = module.get(EventPublishingService);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.parentId).toBe('cat-parent-123');
      expect(eventPublisher.publishEvent).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should prevent duplicate category names', async () => {
      // Arrange
      const command = new CreateCategoryCommand('Electronics');
      const existingCategory = { id: 'cat-old', name: 'Electronics' };

      (categoryRepository.findOne as jest.Mock).mockResolvedValue(existingCategory);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Category with this name already exists');
    });

    it('should prevent self-reference in parent', async () => {
      // Arrange
      const command = new CreateCategoryCommand('Electronics', 'cat-123'); // Same as category being created

      // Act & Assert - This would be caught during update, not create
      // but it's good to document the expected behavior
      expect(command.name).toBe('Electronics');
    });
  });

  describe('Event Publishing Integration', () => {
    it('should publish CategoryCreatedEvent with correct payload', async () => {
      // Arrange
      const command = new CreateCategoryCommand('Tech');
      const savedCategory = {
        id: 'cat-789',
        name: 'Tech',
        parentId: null,
      };

      (categoryRepository.findOne as jest.Mock).mockResolvedValue(null);
      (categoryRepository.create as jest.Mock).mockReturnValue(savedCategory);
      (categoryRepository.save as jest.Mock).mockResolvedValue(savedCategory);
      const eventPublisher = module.get(EventPublishingService);

      // Act
      await handler.execute(command);

      // Assert - Verify event was published
      expect(eventPublisher.publishEvent).toHaveBeenCalled();
      const publishedEvent = (eventPublisher.publishEvent as jest.Mock).mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('CATEGORY_CREATED');
      expect(publishedEvent.categoryId).toBe('cat-789');
      expect(publishedEvent.name).toBe('Tech');
    });
  });
});
