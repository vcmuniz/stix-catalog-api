export class AddCategoryToProductCommand {
  constructor(
    public readonly productId: string,
    public readonly categoryId: string,
  ) {}
}
