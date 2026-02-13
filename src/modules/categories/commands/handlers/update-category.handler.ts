import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UpdateCategoryCommand } from '../impl/update-category.command';
import { Category } from '../../entities/category.entity';
import { CategoryUpdatedEvent } from '../../events/impl/category.events';
import { CategoryBusinessRules } from '../../domain/category-business-rules';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand> {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<Category> {
    this.logger.info('Updating category', { categoryId: command.id });

    const category = await this.categoryRepository.findOne({
      where: { id: command.id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Se name for alterado, validar unicidade
    if (command.name && command.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: command.name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }

      category.name = command.name;
    }

    // Se parentId for alterado, validar que não é self-reference
    if (command.parentId !== undefined && command.parentId !== category.parentId) {
      if (command.parentId) {
        // Validar self-reference
        CategoryBusinessRules.validateNotSelfReference(category.id, command.parentId);

        // Validar que pai existe
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: command.parentId },
        });

        CategoryBusinessRules.validateParentExists(parentCategory);
      }

      category.parentId = command.parentId || null;
    }

    const updatedCategory = await this.categoryRepository.save(category);

    // Publish event to Kafka
    await this.eventPublisher.publishEvent(
      new CategoryUpdatedEvent(updatedCategory.id, updatedCategory.name),
    );

    this.logger.info('Category updated successfully', { categoryId: updatedCategory.id });

    return updatedCategory;
  }
}
