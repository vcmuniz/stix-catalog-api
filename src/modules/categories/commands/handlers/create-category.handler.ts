import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CreateCategoryCommand } from '../impl/create-category.command';
import { Category } from '../../entities/category.entity';
import { CategoryCreatedEvent } from '../../events/impl/category.events';
import { CategoryBusinessRules } from '../../domain/category-business-rules';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand> {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<Category> {
    this.logger.info('Creating category', { name: command.name, parentId: command.parentId });

    // Validar se já existe categoria com mesmo nome
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: command.name },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    // Se parentId for informado, validar se existe e não é self-reference
    if (command.parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: command.parentId },
      });

      CategoryBusinessRules.validateParentExists(parentCategory);
    }

    const category = this.categoryRepository.create({
      name: command.name,
      parentId: command.parentId || null,
    });

    const savedCategory = await this.categoryRepository.save(category);

    // Publish event to Kafka
    await this.eventPublisher.publishEvent(
      new CategoryCreatedEvent(savedCategory.id, savedCategory.name),
    );

    this.logger.info('Category created successfully', { categoryId: savedCategory.id });

    return savedCategory;
  }
}
