import { BadRequestException } from '@nestjs/common';

export class CategoryBusinessRules {
  /**
   * Valida que uma categoria não pode ser pai de si mesma
   * Previne ciclos na hierarquia
   */
  static validateNotSelfReference(categoryId: string, parentId: string): void {
    if (categoryId === parentId) {
      throw new BadRequestException('A category cannot be its own parent');
    }
  }

  /**
   * Valida que duas categorias não podem ter o mesmo nome
   */
  static validateNameUniqueness(
    existingCategoryName: string | null,
    newCategoryName: string,
  ): void {
    if (
      existingCategoryName &&
      existingCategoryName.toLowerCase() === newCategoryName.toLowerCase()
    ) {
      throw new BadRequestException(
        `Category with name "${newCategoryName}" already exists`,
      );
    }
  }

  /**
   * Valida que uma categoria filha existe
   */
  static validateParentExists(parentCategory: any | null): void {
    if (!parentCategory) {
      throw new BadRequestException('Parent category not found');
    }
  }
}
