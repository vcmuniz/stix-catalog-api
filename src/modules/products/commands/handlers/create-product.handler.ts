import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CreateProductCommand } from '../impl/create-product.command';
import { Product } from '../../entities/product.entity';
import { Category } from '../../../categories/entities/category.entity';
import { ProductStatus, ProductBusinessRules } from '../../domain';
import { ProductCreatedEvent } from '../../events/impl/product.events';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    this.logger.info('Creating product', { name: command.name });

    // Validar nome único
    const existingProduct = await this.productRepository.findOne({
      where: { name: command.name },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this name already exists');
    }

    // Validar categorias se fornecidas
    let categories: Category[] = [];
    if (command.categoryIds && command.categoryIds.length > 0) {
      categories = await this.categoryRepository.find({
        where: { id: In(command.categoryIds) },
      });

      if (categories.length !== command.categoryIds.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    // Validar atributos
    if (command.attributes && command.attributes.length > 0) {
      ProductBusinessRules.validateAttributeKeyUniqueness(command.attributes);
    }

    const product = this.productRepository.create({
      name: command.name,
      description: command.description || null,
      status: ProductStatus.DRAFT,
      attributes: command.attributes || [],
      categories,
    });

    const savedProduct = await this.productRepository.save(product);

    // Publish event to Kafka for audit logging
    await this.eventPublisher.publishEvent(
      new ProductCreatedEvent(
        savedProduct.id,
        savedProduct.name,
        savedProduct.description || null,
      ),
    );

    this.logger.info('Product created successfully', { productId: savedProduct.id });

    return savedProduct;
  }
}

