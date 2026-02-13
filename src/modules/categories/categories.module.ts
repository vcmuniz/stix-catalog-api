import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EventPublisherModule } from '../../shared/events/event-publisher.module';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { CreateCategoryHandler } from './commands/handlers/create-category.handler';
import { UpdateCategoryHandler } from './commands/handlers/update-category.handler';
import { GetCategoriesHandler } from './queries/handlers/get-categories.handler';
import { GetCategoryByIdHandler } from './queries/handlers/get-category-by-id.handler';

const CommandHandlers = [CreateCategoryHandler, UpdateCategoryHandler];
const QueryHandlers = [GetCategoriesHandler, GetCategoryByIdHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Category]), CqrsModule, EventPublisherModule],
  controllers: [CategoriesController],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
