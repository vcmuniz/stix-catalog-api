import { IsString, IsOptional, MaxLength, MinLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryCommand {
  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  id!: string;

  @ApiPropertyOptional({ description: 'Category name', example: 'Electronics & Gadgets' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  constructor(id: string, name?: string, parentId?: string) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
  }
}

