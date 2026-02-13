import { IsString, IsUUID, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryCommand {
  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Parent category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  constructor(name: string, parentId?: string) {
    this.name = name;
    this.parentId = parentId;
  }
}
