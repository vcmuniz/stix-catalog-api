export class RemoveCategoryFromProductCommand {
  constructor(
    public readonly productId: string,
    public readonly categoryId: string,
  ) {}
}
