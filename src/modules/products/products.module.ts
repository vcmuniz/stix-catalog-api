import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EventPublisherModule } from '../../shared/events/event-publisher.module';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductHandler } from './commands/handlers/create-product.handler';
import { ActivateProductHandler } from './commands/handlers/activate-product.handler';
import { ArchiveProductHandler } from './commands/handlers/archive-product.handler';
import { AddCategoryToProductHandler } from './commands/handlers/add-category-to-product.handler';
import { AddAttributeToProductHandler } from './commands/handlers/add-attribute-to-product.handler';
import { UpdateProductDescriptionHandler } from './commands/handlers/update-product-description.handler';
import { RemoveCategoryFromProductHandler } from './commands/handlers/remove-category-from-product.handler';
import { RemoveProductAttributeHandler } from './commands/handlers/remove-product-attribute.handler';
import { UpdateProductAttributeHandler } from './commands/handlers/update-product-attribute.handler';
import { GetProductsHandler } from './queries/handlers/get-products.handler';
import { GetProductByIdHandler } from './queries/handlers/get-product-by-id.handler';

const CommandHandlers = [
  CreateProductHandler,
  ActivateProductHandler,
  ArchiveProductHandler,
  AddCategoryToProductHandler,
  AddAttributeToProductHandler,
  UpdateProductDescriptionHandler,
  RemoveCategoryFromProductHandler,
  RemoveProductAttributeHandler,
  UpdateProductAttributeHandler,
];

const QueryHandlers = [GetProductsHandler, GetProductByIdHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category]), CqrsModule, EventPublisherModule],
  controllers: [ProductsController],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
