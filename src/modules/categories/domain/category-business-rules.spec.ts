import { BadRequestException } from '@nestjs/common';
import { CategoryBusinessRules } from './category-business-rules';

describe('CategoryBusinessRules', () => {
  describe('validateNotSelfReference', () => {
    it('should pass when parentId is different from categoryId', () => {
      expect(() => {
        CategoryBusinessRules.validateNotSelfReference('cat-123', 'cat-456');
      }).not.toThrow();
    });

    it('should throw error when parentId equals categoryId', () => {
      expect(() => {
        CategoryBusinessRules.validateNotSelfReference('cat-123', 'cat-123');
      }).toThrow(BadRequestException);
      expect(() => {
        CategoryBusinessRules.validateNotSelfReference('cat-123', 'cat-123');
      }).toThrow('A category cannot be its own parent');
    });

    it('should be case-sensitive for IDs', () => {
      // Assuming IDs are case-sensitive (UUIDs)
      expect(() => {
        CategoryBusinessRules.validateNotSelfReference('CAT-123', 'cat-123');
      }).not.toThrow();
    });
  });

  describe('validateNameUniqueness', () => {
    it('should pass when no existing category name', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness(null, 'Electronics');
      }).not.toThrow();
    });

    it('should pass when existing name is different', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness('Electronics', 'Smartphones');
      }).not.toThrow();
    });

    it('should throw when existing name matches (case-insensitive)', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness('Electronics', 'electronics');
      }).toThrow(BadRequestException);
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness('Electronics', 'electronics');
      }).toThrow('Category with name "electronics" already exists');
    });

    it('should throw when existing name matches exactly', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness('Electronics', 'Electronics');
      }).toThrow(BadRequestException);
    });

    it('should handle null existing name', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness(null, 'Electronics');
      }).not.toThrow();
    });

    it('should handle mixed case', () => {
      expect(() => {
        CategoryBusinessRules.validateNameUniqueness('ElEcTrOnIcS', 'ELECTRONICS');
      }).toThrow(BadRequestException);
    });
  });

  describe('validateParentExists', () => {
    it('should pass when parent category exists', () => {
      const parentCategory = { id: 'cat-123', name: 'Electronics' };
      expect(() => {
        CategoryBusinessRules.validateParentExists(parentCategory);
      }).not.toThrow();
    });

    it('should throw when parent category is null', () => {
      expect(() => {
        CategoryBusinessRules.validateParentExists(null);
      }).toThrow(BadRequestException);
      expect(() => {
        CategoryBusinessRules.validateParentExists(null);
      }).toThrow('Parent category not found');
    });

    it('should throw when parent category is undefined', () => {
      expect(() => {
        CategoryBusinessRules.validateParentExists(undefined);
      }).toThrow(BadRequestException);
    });

    it('should pass with any truthy parent object', () => {
      const parentCategory = { id: 'any-id' }; // Minimal object
      expect(() => {
        CategoryBusinessRules.validateParentExists(parentCategory);
      }).not.toThrow();
    });
  });
});
